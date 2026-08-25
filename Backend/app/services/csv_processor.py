import pandas as pd
from io import BytesIO


REQUIRED_COLUMNS = [
    "order_id",
    "date",
    "customer_id",
    "customer_name",
    "product",
    "category",
    "quantity",
    "unit_price",
]


class CSVProcessingError(Exception):
    pass


def process_csv(file_content: bytes) -> tuple[pd.DataFrame, list[str]]:
    """
    Reads, validates, and cleans a CSV file.

    Returns:
        cleaned DataFrame
        list of validation/cleaning messages
    """

    try:
        df = pd.read_csv(BytesIO(file_content))
    except Exception as e:
        raise CSVProcessingError(f"Could not read CSV file: {str(e)}")

    messages = []

    # 1. Check required columns
    missing_columns = [
        column for column in REQUIRED_COLUMNS
        if column not in df.columns
    ]

    if missing_columns:
        raise CSVProcessingError(
            f"Missing required columns: {', '.join(missing_columns)}"
        )

    # 2. Keep only columns we need
    df = df[REQUIRED_COLUMNS].copy()

    # 3. Remove completely empty rows
    initial_count = len(df)
    df = df.dropna(how="all")

    removed = initial_count - len(df)

    if removed > 0:
        messages.append(f"Removed {removed} empty rows.")

    # 4. Clean string columns
    string_columns = [
        "order_id",
        "customer_id",
        "customer_name",
        "product",
        "category",
    ]

    for column in string_columns:
        df[column] = df[column].astype("string").str.strip()

    # 5. Convert date
    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce"
    ).dt.date

    invalid_dates = df["date"].isna().sum()

    if invalid_dates > 0:
        messages.append(
            f"Removed {invalid_dates} rows with invalid dates."
        )

        df = df.dropna(subset=["date"])

    # 6. Convert numeric fields
    df["quantity"] = pd.to_numeric(
        df["quantity"],
        errors="coerce"
    )

    df["unit_price"] = pd.to_numeric(
        df["unit_price"],
        errors="coerce"
    )

    # 7. Remove invalid numeric values
    invalid_numeric = (
        df["quantity"].isna()
        | df["unit_price"].isna()
        | (df["quantity"] <= 0)
        | (df["unit_price"] < 0)
    )

    invalid_count = invalid_numeric.sum()

    if invalid_count > 0:
        messages.append(
            f"Removed {invalid_count} rows with invalid quantity or price."
        )

        df = df[~invalid_numeric]

    # 8. Convert quantity to integer
    df["quantity"] = df["quantity"].astype(int)

    # 9. Calculate total amount
    df["total_amount"] = (
        df["quantity"] * df["unit_price"]
    )

    # 10. Remove duplicate transactions
    duplicate_count = df.duplicated(
        subset=["order_id", "product", "customer_id"]
    ).sum()

    if duplicate_count > 0:
        messages.append(
            f"Removed {duplicate_count} duplicate transactions."
        )

        df = df.drop_duplicates(
            subset=["order_id", "product", "customer_id"]
        )

    # 11. Validate required values
    required_data_columns = [
        "order_id",
        "customer_id",
        "product",
    ]

    missing_data = df[required_data_columns].isna().any(axis=1)

    missing_count = missing_data.sum()

    if missing_count > 0:
        messages.append(
            f"Removed {missing_count} rows with missing required data."
        )

        df = df[~missing_data]

    if df.empty:
        raise CSVProcessingError(
            "No valid transactions remain after data cleaning."
        )

    return df, messages