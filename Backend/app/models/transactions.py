from sqlalchemy import Column, Integer, String, Float, Date
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True)
    order_id = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    customer_id = Column(String, nullable=False)
    customer_name = Column(String)
    product = Column(String, nullable=False)
    category = Column(String)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    
    