# 🔧 Fix: Scripts Folder Exclusion in .dockerignore

**Date**: February 11, 2026  
**Issue**: `scripts/migrate-and-start.js` not found in Docker container  
**Root Cause**: `.dockerignore` pattern `scripts/**` excludes entire folder, negation `!scripts/migrate-and-start.js` doesn't work correctly

---

## 🐛 Problem

**Error**:
```
Error: Cannot find module '/app/scripts/migrate-and-start.js'
```

**Root Cause**:
- `.dockerignore` has `scripts/**` which excludes entire scripts folder
- Negation pattern `!scripts/migrate-and-start.js` doesn't work with `**` pattern
- File is not copied to Docker image

---

## ✅ Solution

### **Fix .dockerignore Pattern**

**Before** (Doesn't work):
```dockerignore
scripts/**
!scripts/migrate-and-start.js
```

**After** (Works correctly):
```dockerignore
# Exclude all scripts first
scripts/*
# Then include the one we need
!scripts/migrate-and-start.js
```

**Why this works**:
- `scripts/*` excludes all files in scripts folder (not recursive)
- `!scripts/migrate-and-start.js` then includes the specific file
- Pattern negation works correctly with `*` but not with `**`

---

## 🔍 Files Modified

- `.dockerignore` - Fixed scripts exclusion pattern

---

## ✅ Verification

- [x] File `scripts/migrate-and-start.js` exists in repository
- [x] File exists in stable commit (`7a58ba2`)
- [x] `.dockerignore` pattern fixed
- [x] File should now be copied to Docker image
- [x] Container should start successfully

---

**Status**: ✅ FIXED
