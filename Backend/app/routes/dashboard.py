from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.services.analytics import get_dashboard_analytics


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


@router.get("")
def dashboard(
    db: Session = Depends(get_db)
):
    return get_dashboard_analytics(db)