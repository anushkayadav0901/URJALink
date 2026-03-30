import os
import re


def main():
    directory = r"C:\Users\Anushka Yadav\Downloads\URJALINK-main\URJALINK-main"
    extensions = {".py", ".ts", ".tsx", ".js", ".jsx", ".html", ".md", ".json"}

    replacements = [
        (re.compile(r"URJALINK", re.IGNORECASE), "URJALINK"),
        (re.compile(r"URJALINK", re.IGNORECASE), "URJALINK"),
        (re.compile(r"URJALINK", re.IGNORECASE), "URJALINK"),
        (re.compile(r"URJALINK logo\.png", re.IGNORECASE), "urjalink_logo.png"),
    ]

    for root, _, files in os.walk(directory):
        if (
            "node_modules" in root
            or ".venv" in root
            or ".git" in root
            or "__pycache__" in root
        ):
            continue
        for file in files:
            if not any(file.endswith(ext) for ext in extensions):
                continue

            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                new_content = content
                for pattern, repl in replacements:
                    new_content = pattern.sub(repl, new_content)

                if new_content != content:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated: {filepath}")
            except Exception as e:
                print(f"Failed to read/write {filepath}: {e}")


if __name__ == "__main__":
    main()
