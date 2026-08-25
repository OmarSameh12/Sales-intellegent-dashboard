from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.csv_processor import process_csv, CSVProcessingError
from app.models.transactions import Transaction
from fastapi.responses import StreamingResponse
import io
import pandas as pd

router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.post("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Check file type
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Only CSV files are supported."
        )

    try:
        # Read uploaded file
        file_content = await file.read()

        # Process and validate CSV
        df, messages = process_csv(file_content)

        # Convert DataFrame rows to database entities
        transactions = [
            Transaction(
                order_id=row["order_id"],
                date=row["date"],
                customer_id=row["customer_id"],
                customer_name=row["customer_name"],
                product=row["product"],
                category=row["category"],
                quantity=row["quantity"],
                unit_price=row["unit_price"],
                total_amount=row["total_amount"]
            )
            for _, row in df.iterrows()
        ]

        # Insert into PostgreSQL
        db.add_all(transactions)
        db.commit()

        return {
            "message": "CSV uploaded successfully.",
            "rows_processed": len(transactions),
            "messages": messages
        }

    except CSVProcessingError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Failed to import transactions: {str(e)}"
        )
        
@router.get("")
def get_transactions(
    db: Session = Depends(get_db)
):
    transactions = (
        db.query(Transaction)
        .order_by(Transaction.date.desc())
        .all()
    )

    return [
        {
            "id": transaction.id,
            "order_id": transaction.order_id,
            "date": transaction.date.isoformat(),
            "customer_id": transaction.customer_id,
            "customer_name": transaction.customer_name,
            "product": transaction.product,
            "category": transaction.category,
            "quantity": transaction.quantity,
            "unit_price": transaction.unit_price,
            "total_amount": transaction.total_amount
        }
        for transaction in transactions
    ]
    
@router.get("/export")
def export_transactions(
    db: Session = Depends(get_db)
):
    transactions = (
        db.query(Transaction)
        .order_by(Transaction.date.desc())
        .all()
    )

    data = [
        {
            "order_id": transaction.order_id,
            "date": transaction.date,
            "customer_id": transaction.customer_id,
            "customer_name": transaction.customer_name,
            "product": transaction.product,
            "category": transaction.category,
            "quantity": transaction.quantity,
            "unit_price": transaction.unit_price,
            "total_amount": transaction.total_amount
        }
        for transaction in transactions
    ]

    df = pd.DataFrame(data)

    csv_buffer = io.StringIO()
    df.to_csv(csv_buffer, index=False)

    csv_buffer.seek(0)

    return StreamingResponse(
        iter([csv_buffer.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=transactions.csv"
        }
    )