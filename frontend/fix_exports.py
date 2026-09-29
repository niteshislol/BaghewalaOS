import os
from pathlib import Path

pages_dir = Path(r"c:\Users\nites\Downloads\SIH26120\BaghewalaOS\frontend\src\pages")

for file in pages_dir.glob("*.tsx"):
    content = file.read_text(encoding="utf-8")
    if "export default" not in content:
        # Find the named export component
        # usually: export const PageName = ...
        lines = content.split('\n')
        name = None
        for line in lines:
            if line.startswith("export const "):
                name = line.split("export const ")[1].split(":")[0].split("=")[0].strip()
                # in case of export const PageName: React.FC ...
                break
        
        if name:
            file.write_text(content + f"\n\nexport default {name};\n", encoding="utf-8")
            print(f"Added default export to {file.name}")
        else:
            print(f"Could not find named export in {file.name}")
