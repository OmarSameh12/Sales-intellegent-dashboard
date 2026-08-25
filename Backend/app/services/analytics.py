from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.transactions import Transaction


def get_dashboard_analytics(db: Session):

    # -------------------------
    # 1. Summary
    # -------------------------

    revenue = (
        db.query(func.sum(Transaction.total_amount))
        .scalar()
        or 0
    )

    orders = (
        db.query(func.count(func.distinct(Transaction.order_id)))
        .scalar()
        or 0
    )

    customers = (
        db.query(func.count(func.distinct(Transaction.customer_id)))
        .scalar()
        or 0
    )

    average_order_value = (
        revenue / orders
        if orders > 0
        else 0
    )

    # -------------------------
    # 2. Sales Trend
    # -------------------------

    sales_rows = (
        db.query(
            Transaction.date,
            func.sum(Transaction.total_amount).label("revenue"),
            func.count(func.distinct(Transaction.order_id)).label("orders")
        )
        .group_by(Transaction.date)
        .order_by(Transaction.date)
        .all()
    )

    sales_trend = [
        {
            "date": row.date.isoformat(),
            "revenue": float(row.revenue or 0),
            "orders": row.orders
        }
        for row in sales_rows
    ]

    # -------------------------
    # 3. Product Performance
    # -------------------------

    product_rows = (
        db.query(
            Transaction.product,
            func.sum(Transaction.quantity).label("quantity"),
            func.sum(Transaction.total_amount).label("revenue")
        )
        .group_by(Transaction.product)
        .order_by(func.sum(Transaction.total_amount).desc())
        .all()
    )

    products = [
        {
            "product": row.product,
            "quantity": row.quantity,
            "revenue": float(row.revenue or 0)
        }
        for row in product_rows
    ]

    # -------------------------
    # 4. Category Performance
    # -------------------------

    category_rows = (
        db.query(
            Transaction.category,
            func.sum(Transaction.total_amount).label("revenue"),
            func.sum(Transaction.quantity).label("quantity")
        )
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.total_amount).desc())
        .all()
    )

    categories = [
        {
            "category": row.category,
            "revenue": float(row.revenue or 0),
            "quantity": row.quantity
        }
        for row in category_rows
    ]

    # -------------------------
    # 5. Customer Behaviour
    # -------------------------

    customer_rows = (
        db.query(
            Transaction.customer_id,
            Transaction.customer_name,
            func.count(func.distinct(Transaction.order_id)).label("orders"),
            func.sum(Transaction.total_amount).label("spending"),
            func.max(Transaction.date).label("last_purchase")
        )
        .group_by(
            Transaction.customer_id,
            Transaction.customer_name
        )
        .order_by(func.sum(Transaction.total_amount).desc())
        .all()
    )

    average_customer_spending = (
        sum(float(row.spending or 0) for row in customer_rows)
        / len(customer_rows)
        if customer_rows
        else 0
    )

    customer_data = []

    for row in customer_rows:

        order_count = row.orders
        spending = float(row.spending or 0)

        # Basic segmentation
        if order_count == 1:
            segment = "New"
        elif spending > average_customer_spending:
            segment = "High Value"
        else:
            segment = "Returning"

        customer_data.append({
            "customer_id": row.customer_id,
            "customer_name": row.customer_name,
            "orders": order_count,
            "spending": spending,
            "last_purchase": (
                row.last_purchase.isoformat()
                if row.last_purchase
                else None
            ),
            "segment": segment
        })

    # -------------------------
    # 6. Repeat Customers
    # -------------------------

    repeat_customers = sum(
        1 for customer in customer_data
        if customer["orders"] > 1
    )

    # -------------------------
    # Final response
    # -------------------------

    return {
        "summary": {
            "revenue": float(revenue),
            "orders": orders,
            "customers": customers,
            "average_order_value": float(average_order_value)
        },

        "sales_trend": sales_trend,

        "products": products,

        "categories": categories,

        "customers": {
            "total": customers,
            "repeat_customers": repeat_customers,
            "data": customer_data
        }
    }