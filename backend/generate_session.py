"""
Run this once locally to generate a Telegram session string.
Copy the output and add it as TELEGRAM_SESSION_STRING in Render.
"""
from telethon.sync import TelegramClient
from telethon.sessions import StringSession

API_ID = 22992853
API_HASH = "4a399c92844e7c32d29e5c43276a3521"

with TelegramClient(StringSession(), API_ID, API_HASH) as client:
    print("\n✅ Session string (copy this to Render as TELEGRAM_SESSION_STRING):\n")
    print(client.session.save())
