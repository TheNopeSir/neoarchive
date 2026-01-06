# NeoArchive Deployment Guide

## 🚀 Quick Start

### Option 1: Normal Deployment (Fast, uses cache)
```bash
bash deploy.sh
```
**Use when:** Regular updates, code changes

### Option 2: Clean Deployment (Slow, no cache)
```bash
bash deploy-clean.sh
```
**Use when:**
- TypeScript build errors
- Docker cache issues
- First deployment
- After major dependency updates

---

## 📋 Deployment Methods

### Local Deployment (Docker Compose)

#### 1. Normal Deploy (with cache - fast)
```bash
# Pull latest code
git pull

# Deploy
bash deploy.sh
```

#### 2. Clean Deploy (no cache - fixes build errors)
```bash
# Pull latest code
git pull

# Clean deploy (rebuilds everything)
bash deploy-clean.sh
```

#### 3. Manual Docker Commands
```bash
# Stop containers
docker-compose down

# Build without cache
docker-compose build --no-cache

# Start
docker-compose up -d

# View logs
docker-compose logs -f
```

---

### Automated Deployment (GitHub Actions)

The repository includes GitHub Actions workflow that automatically:
1. Builds Docker image **without cache** on push to main/master
2. Can be triggered manually from GitHub UI

**To enable:**
1. Push to `main` or `master` branch
2. Or go to Actions tab → Deploy NeoArchive → Run workflow

---

## 🔧 Troubleshooting

### Problem: TypeScript build errors like "Module has no exported member"

**Solution:** Use clean deployment
```bash
bash deploy-clean.sh
```

**Why:** Docker cached old files. Clean build removes all cache.

---

### Problem: "Cannot find module" errors

**Solution:**
```bash
# Clean everything
docker-compose down
docker system prune -a -f
bash deploy-clean.sh
```

---

### Problem: Changes not reflected after deploy

**Solution:**
```bash
# Force rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 📊 Monitoring

### View logs
```bash
docker-compose logs -f
```

### Check container status
```bash
docker-compose ps
```

### Restart without rebuild
```bash
docker-compose restart
```

### Stop application
```bash
docker-compose down
```

---

## 🎯 Deployment Checklist

Before deploying:
- [ ] All changes committed and pushed
- [ ] Database migration applied (if needed)
- [ ] Environment variables set in `.env`
- [ ] Build passes locally: `npm run build`

After deploying:
- [ ] Check logs: `docker-compose logs -f`
- [ ] Test application access
- [ ] Verify API endpoints working
- [ ] Check database connectivity

---

## 📝 Environment Variables

Required in `.env`:
```bash
# Database
DB_HOST=89.169.46.157
DB_USER=gen_user
DB_NAME=default_db
DB_PASSWORD=your_password

# SMTP (for emails)
SMTP_EMAIL=morpheus@neoarch.ru
SMTP_PASSWORD=your_smtp_password

# Server
PORT=3000
```

---

## 🔄 Update Process

### Regular Updates
1. `git pull` - Get latest code
2. `bash deploy.sh` - Deploy with cache
3. Check logs - `docker-compose logs -f`

### Major Updates / Fixes
1. `git pull` - Get latest code
2. `bash deploy-clean.sh` - Clean deploy
3. Check logs - `docker-compose logs -f`

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| Build errors about missing exports | Run `deploy-clean.sh` |
| Old code still running | Run `deploy-clean.sh` |
| Docker out of space | `docker system prune -a -f` |
| Port 3000 already in use | `docker-compose down` first |
| Container keeps restarting | Check logs: `docker-compose logs` |

---

## 💡 Tips

1. **Use `deploy.sh` by default** - it's faster
2. **Use `deploy-clean.sh` when troubleshooting** - it fixes cache issues
3. **Always check logs after deploy** - catches errors early
4. **Keep `.env` file secure** - never commit it to git

---

*Last updated: 2026-01-06*
