from fastapi import FastAPI

from app.routes.transactions import router as transactions_router
from app.routes.dashboard import router as dashboard_router
from fastapi.middleware.cors import CORSMiddleware



app = FastAPI(
    title="Retail Analytics API"
)


app.include_router(transactions_router)
app.include_router(dashboard_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/")
def root():
    return {
        "message": "Retail Analytics API is running"
    }
    
