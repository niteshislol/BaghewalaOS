import os
import glob
import re
import shutil

ROOT_DIR = r"c:\Users\nites\Downloads\SIH26120\SIH26120_BaghewalaOS_COMPLETE_SOLUTION_2026-09-28\BaghewalaOS"

REPLACEMENTS = {
    "WagheraOS": "WagheraOS",
    "WagheraOS": "WagheraOS",
    "WagheraOS": "WagheraOS",
    "WagheraOS": "WagheraOS",
    "WagheraOS": "WagheraOS",
    "waghera_origin": "waghera_origin",
    "waghera": "waghera",
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    new_content = content
    for old, new in REPLACEMENTS.items():
        # case insensitive replace maybe? No, let's keep case as they appear
        new_content = new_content.replace(old, new)
        
    if content != new_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    extensions = ['*.py', '*.ts', '*.tsx', '*.json', '*.md', '*.txt']
    for ext in extensions:
        for filepath in glob.glob(os.path.join(ROOT_DIR, '**', ext), recursive=True):
            if "node_modules" in filepath or ".git" in filepath or "__pycache__" in filepath:
                continue
            process_file(filepath)

    # Rename file backend/app/integrations/waghera_origin.py to waghera_origin.py
    old_file = os.path.join(ROOT_DIR, 'backend', 'app', 'integrations', 'waghera_origin.py')
    new_file = os.path.join(ROOT_DIR, 'backend', 'app', 'integrations', 'waghera_origin.py')
    if os.path.exists(old_file):
        os.rename(old_file, new_file)
        print(f"Renamed {old_file} to {new_file}")

    # Rename directory backend/app/ml/artifacts/waghera_origin to waghera_origin
    old_dir = os.path.join(ROOT_DIR, 'backend', 'app', 'ml', 'artifacts', 'waghera_origin')
    new_dir = os.path.join(ROOT_DIR, 'backend', 'app', 'ml', 'artifacts', 'waghera_origin')
    if os.path.exists(old_dir):
        os.rename(old_dir, new_dir)
        print(f"Renamed {old_dir} to {new_dir}")

if __name__ == '__main__':
    main()
