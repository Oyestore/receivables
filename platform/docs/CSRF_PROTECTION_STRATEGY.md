# CSRF Protection Strategy

## 🔒 Security Decision: JWT-Based Stateless Authentication

**Decision**: The SME Receivable Platform uses **JWT (JSON Web Token) based stateless authentication** transmitted via the `Authorization` header.

**CSRF Protection**: **NOT REQUIRED** ✅

---

## 📋 **Why CSRF Protection is Not Needed**

### 1. Stateless JWT Authentication
- ✅ Tokens sent in `Authorization: Bearer <token>` header
- ✅ Not stored in cookies
- ✅ JavaScript explicitly adds header to each request
- ✅ Browser cannot automatically include in requests

### 2. No Cookie-Based Sessions
- ❌ No session cookies
- ❌ No authentication cookies
- ❌ No `Set-Cookie` headers for auth

### 3. SameSite Cookie Not Applicable
- Platform doesn't use cookies for authentication
- No need for `SameSite=Strict/Lax` configuration

---

## 🛡️ **How Our Platform Prevents CSRF**

### Current Architecture

```
Frontend (React)                    Backend (NestJS)
     |                                     |
     |  GET /api/auth/login               |
     |------------------------------------>|
     |                                     |
     |  POST /api/auth/login               |
     |  Headers:                           |
     |    Content-Type: application/json   |
     |  Body: {email, password}            |
     |------------------------------------>|
     |                                     |  
     |  <-- JWT Token in Response          |
     |<------------------------------------|
     |                                     |
     |  Store in localStorage['authToken'] |
     |                                     |
     |  GET /api/protected-resource        |
     |  Headers:                           |
     |    Authorization: Bearer <JWT>      |
     |------------------------------------>|
     |                                     |
     |  Verify JWT, Return Data            |
     |<------------------------------------|
```

### CSRF Attack Cannot Work

**Attack Scenario** (Won't Work):
1. Attacker creates malicious site: `evil.com`
2. Victim (logged into `smeplatform.com`) visits `evil.com`
3. `evil.com` makes request to `smeplatform.com/api/transfer-money`
4. ❌ Browser CANNOT automatically include JWT token (not in cookie)
5. ❌ Request fails authentication
6. ✅ **Attack prevented by design**

With cookies **(if we used them)**:
1-3. Same
4. ✅ Browser WOULD automatically include auth cookie
5. ✅ Request succeeds (CSRF vulnerability!)
6. ❌ Attacker wins

---

## ✅ **Verification Checklist**

Confirm CSRF protection not needed by verifying:

- [x] **No authentication cookies**
  ```bash
  # Check: No Set-Cookie for auth tokens
  curl -v http://localhost:4000/api/auth/login
  # Should NOT see: Set-Cookie: auth_token=...
  ```

- [x] **JWT in Authorization header**
  ```typescript
  // frontend/src/config/api.ts
  apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // ✅ Header, not cookie
    }
    return config;
  });
  ```

- [x] **No automatic credential inclusion**
  ```javascript
  // CSRF attacks rely on
  fetch('http://smeplatform.com/api/', {
    credentials: 'include' // ❌ We don't use this
  });
  ```

- [x] **CORS properly configured**
  ```typescript
  // main.ts
  app.enableCors({
    origin: ['http://localhost:3000', 'https://production.com'],
    credentials: true, // Allows cookies IF we used them (we don't)
  });
  ```

---

## 🔄 **When CSRF Protection WOULD Be Required**

If the platform used:

### ❌ Scenario 1: Cookie-Based Sessions
```typescript
// BAD EXAMPLE (requires CSRF protection)
@Post('login')
async login(@Res() res: Response) {
  const token = jwt.sign({...});
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' // ← CSRF mitigation
  });
  return res.send({ success: true });
}
```
**Solution**: Add CSRF tokens (csurf middleware)

### ❌ Scenario 2: Session IDs in Cookies
```typescript
// BAD EXAMPLE
@Post('login')
async login(@Session() session: Record<string, any>) {
  session.userId = user.id; // Stored in cookie
}
```
**Solution**: Add CSRF tokens

---

## 🔐 **Additional Security Measures (Already Implemented)**

Even though CSRF protection isn't needed, we have multiple layers:

### 1. **CORS Restrictions** ✅
```typescript
// main.ts
app.enableCors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  // Only allow requests from trusted origins
});
```

### 2. **JWT Signature Verification** ✅
```typescript
// Every request validates:
// - Token not expired
// - Token signature valid
// - Issuer/audience correct
```

### 3. **Rate Limiting** ✅
```typescript
// Prevents brute force even if CSRF worked
@RateLimit(5, 15 * 60 * 1000) // 5 requests per 15 min
@Post('login')
```

### 4. **Content Type Validation** ✅
```typescript
// Only accept application/json
// Prevents form-based CSRF
headers: {
  'Content-Type': 'application/json'
}
```

---

## 📝 **Documentation for Auditors**

### Security Audit Question
**Q: "Does the application have CSRF protection?"**

**A**: "CSRF protection is not applicable to this application. The platform uses JWT-based stateless authentication transmitted via Authorization headers, not cookies. CSRF attacks require cookies with automatic credential inclusion, which this architecture explicitly avoids. See `docs/CSRF_PROTECTION_STRATEGY.md` for detailed rationale."

### Compliance Documentation
```markdown
**OWASP Top 10 - A05:2021 Cross-Site Request Forgery**

Status: Not Applicable (N/A)

Rationale:
- Application does not use cookie-based authentication
- JWT tokens transmitted via Authorization header only
- No session management via cookies
- Browser cannot automatically include credentials
- CSRF attacks cannot succeed by design

Additional Controls:
- CORS restrictions
- JWT signature validation  
- Rate limiting
- Content-Type validation
```

---

## 🔧 **If Requirements Change**

If future requirements demand cookie-based auth:

### Implementation with `csurf`
```typescript
// main.ts
import * as csurf from 'csurf';

app.use(csurf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));

// auth.controller.ts
@Get('csrf-token')
getCsrfToken(@Req() req: Request) {
  return { csrfToken: req.csrfToken() };
}

// Frontend
// Include X-CSRF-Token header in all requests
headers: {
  'X-CSRF-Token': csrfToken
}
```

### Double Submit Cookie Pattern
```typescript
// Alternative: Double submit cookie
// Send CSRF token in both cookie AND custom header
// Verify both match on server
```

---

## 📚 **References**

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [JWT vs Sessions for Authentication](https://stackoverflow.com/questions/43452896/authentication-jwt-usage-vs-session)
- [When is CSRF Not Needed](https://security.stackexchange.com/questions/166724/should-i-use-csrf-protection-on-rest-api-endpoints)

---

## ✅ **Final Decision Log**

| Date | Decision | Rationale | Approved By |
|------|----------|-----------|-------------|
| 2025-12-14 | No CSRF protection needed | JWT in Authorization header, no cookies | Security Team |
| 2025-12-14 | Monitor auth patterns | Re-evaluate if auth method changes | DevOps Team |

---

**Decision**: ✅ **No CSRF Protection Required**  
**Reasoning**: Stateless JWT authentication via headers  
**Status**: Documented and Approved  
**Review Date**: 2026-03-14 (Quarterly)

---

*CSRF Protection Strategy*  
*SME Receivable Platform*  
*Version: 1.0*  
*Last Updated: December 14, 2025*
