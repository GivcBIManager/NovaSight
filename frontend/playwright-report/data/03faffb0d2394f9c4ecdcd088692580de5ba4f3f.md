# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e7]: "N"
      - heading "Forgot password?" [level=3] [ref=e8]
      - paragraph [ref=e9]: Enter your email and we'll send you a reset link
    - generic [ref=e11]:
      - img [ref=e13]
      - generic [ref=e16]:
        - heading "Check your email" [level=3] [ref=e17]
        - paragraph [ref=e18]: We've sent a password reset link to test@example.com
      - paragraph [ref=e19]:
        - text: Didn't receive the email?
        - button "Click to resend" [ref=e20] [cursor=pointer]
      - link "Back to login" [ref=e21] [cursor=pointer]:
        - /url: /login
        - img [ref=e22]
        - text: Back to login
  - region "Notifications (F8)":
    - list
  - generic [ref=e24]:
    - img [ref=e26]
    - button "Open Tanstack query devtools" [ref=e74] [cursor=pointer]:
      - img [ref=e75]
```