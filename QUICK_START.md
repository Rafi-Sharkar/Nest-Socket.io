# ✅ Quick Start Checklist

## 1️⃣ Start Backend Server
- [ ] Open PowerShell in project folder: `c:\Rafi Docs\one-to-one-chat`
- [ ] Run: `pnpm dev` (or `npm run dev`)
- [ ] Wait for message: `🚀 Server running on http://localhost:5000`
- [ ] No errors shown

## 2️⃣ Open test.html
- [ ] Open file in browser: `c:\Rafi Docs\one-to-one-chat\test.html`
- [ ] Status shows: 🟢 Connected (not 🔴 Connecting)
- [ ] Browser console (F12) shows: `✅ Connected to server`

## 3️⃣ Test Basic Messaging
- [ ] You are prompted to enter User ID (1 or 2)
- [ ] Chat header shows "Chat with User X"
- [ ] You can type and send messages
- [ ] Messages appear in chat with timestamp
- [ ] Shows ✓ (sent), ✓✓ (read) status

## 4️⃣ Test File Sharing
- [ ] Click 📎 File button
- [ ] Select a file from computer
- [ ] See "📤 Uploading file..." message
- [ ] File appears in chat with icon and size
- [ ] Can click ⬇️ to download
- [ ] Can click 🗑️ to delete (for your files)

## 5️⃣ Test Two Users (Optional)
- [ ] Open test.html in two browser windows
- [ ] Window 1: Enter User ID 1
- [ ] Window 2: Enter User ID 2
- [ ] Both show 🟢 Connected
- [ ] Send message from User 1
- [ ] Appears in User 2's window
- [ ] Send file from User 2
- [ ] Appears in User 1's window

## 6️⃣ Troubleshooting

### If showing 🔴 Disconnected:
- [ ] Check backend is running (see step 1)
- [ ] Hard refresh browser: Ctrl+Shift+R
- [ ] Check browser console for errors
- [ ] See CONNECTION_TROUBLESHOOTING.md

### If file upload fails:
- [ ] Check file size < 100MB
- [ ] Check backend still running
- [ ] Look at browser console errors
- [ ] Try with smaller file first

### If messages not appearing:
- [ ] Make sure other user is connected
- [ ] Check online/offline indicators
- [ ] Refresh page and try again

---

## 📱 Default Test Users
- **User 1** → Chats with User 2
- **User 2** → Chats with User 1

---

## 📞 Need Help?

Check these files:
- `FIX_SUMMARY.md` - What was fixed
- `CONNECTION_TROUBLESHOOTING.md` - Detailed troubleshooting guide
- Browser Console (F12) - Error messages

---

✨ **Everything should work now!**
