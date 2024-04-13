from contextlib import closing
import argparse
from scripts.iib.db.datamodel import DataBase
import os

import shutil


def replace_path(old_base, new_base):
    """
    Custom SQL function to replace part of a path.

    Args:
        old_base (str): The base part of the path to be replaced.
        new_base (str): The new base part of the path.

    Returns:
        str: Updated path.
    """

    def replace_func(path):
        if path.startswith(old_base):
            return new_base + path[len(old_base) :]
        else:
            return path

    return replace_func


def update_paths(conn, table_name, old_base):
    """
    Update paths in a specified SQLite table using a custom SQL function.

    Args:
        db_path (str): Path to the SQLite database file.
        table_name (str): Name of the table containing the paths.

    Returns:
        None
    """
    with closing(conn.cursor()) as cur:
        # Use the custom function in an UPDATE statement
        cur.execute(
            f"UPDATE {table_name} SET path = replace_path(path) WHERE path LIKE ?",
            (f"{old_base}%",),
        )

        # Commit the changes and close the connection
        conn.commit()


def setup_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Script to migrate paths in an IIB SQLite database from an old directory structure to a new one."
    )
    parser.add_argument(
        "--db_path", type=str, help="Path to the input IIB QLite database file to be migrated. Default value is 'iib.db'.", default="iib.db"
    )
    parser.add_argument(
        "--old_dir", type=str, help="Old base directory to be replaced in the paths.", required=True
    )
    parser.add_argument(
        "--new_dir", type=str, help="New base directory to replace the old base directory in the paths.", required=True
    )
    return parser


if __name__ == "__main__":
    parser = setup_parser()
    args = parser.parse_args()
    old_base = args.old_dir
    new_base = args.new_dir
    db_path = args.db_path
    db_temp_path = "db_migrate_temp.db"
    shutil.copy2(db_path, db_temp_path)
    DataBase.path = os.path.normpath(os.path.join(os.getcwd(), db_temp_path))
    conn = DataBase.get_conn()
    conn.create_function("replace_path", 1, replace_path(old_base, new_base))
    update_paths(conn, "image", old_base)
    update_paths(conn, "extra_path", old_base)
    update_paths(conn, "folders", old_base)
    shutil.copy(db_temp_path, "iib.db")
    # os.remove(db_temp_path)
    print("Database migration completed successfully.")
