# Access Control & RLS Fixes Tracker

## Completed
- [x] API route TS errors (audit-logs, notifications)

## Plan Steps (Approved)
1. [ ] Update API role checks to users.role = 'super_admin'
2. [ ] Update Sidebar + settings pages to check users.role
3. [ ] Fix RLS policies in migrations 
4. [ ] Profile page team/suspension logic

## Testing
- [ ] No more 403 RLS errors
- [ ] Super admin sees all settings
- [ ] Admin sees limited settings
- [ ] Regular users access denied
