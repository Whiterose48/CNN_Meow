import google.generativeai as genai
import os

genai.configure(api_key="AIzaSyCm6aVMgr64SR5LtUWrSjKkdZ0sd7fxKVk")

for m in genai.list_models():
    if "generateContent" in m.supported_generation_methods:
        print(m.name)