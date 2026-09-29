import urllib.request
import json
try:
    with urllib.request.urlopen("http://localhost:8000/api/v1/wells/BGW-01/twin") as response:
        print(response.read().decode())
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
