
import getpass

from sqlalchemy import select

from backend.app.core.security import hash_password
from backend.app.db.session import SessionLocal
from backend.app.models.user import User


def create_owner() -> None:
    db = SessionLocal()

    try:
        existing_owner = db.scalar(select(User.id).limit(1))

        if existing_owner is not None:
            print("An owner account already exists. No account was created.")
            return

        name = input("Owner name: ").strip()
        email = input("Owner email: ").strip().lower()

        if not name or not email:
            print("Name and email cannot be empty.")
            return

        password = getpass.getpass("Owner password: ")
        confirm_password = getpass.getpass("Confirm password: ")

        if len(password) < 12:
            print("Password must contain at least 12 characters.")
            return

        if len(password) > 128:
            print("Password must not exceed 128 characters.")
            return

        if password != confirm_password:
            print("Passwords do not match.")
            return

        owner = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            is_active=True,
        )

        db.add(owner)
        db.commit()

        print(f"Owner account created successfully for {email}.")

    except Exception:
        db.rollback()
        print("Owner account creation failed. Check the error and try again.")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    create_owner()
