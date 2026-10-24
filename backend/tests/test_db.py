
from sqlalchemy import text

from backend.app.db.session import engine


def main():
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), version()")
        )
        database_name, postgres_version = result.one()

    print(f"Connected database: {database_name}")
    print(f"PostgreSQL version: {postgres_version}")


if __name__ == "__main__":
    main()
