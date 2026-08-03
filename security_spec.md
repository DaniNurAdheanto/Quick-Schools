1. Data Invariants: A student profile must have an id, name, classId, and status. It can only be created, read, updated, or deleted by authenticated users.
2. The "Dirty Dozen" Payloads:
- Unauthenticated read
- Unauthenticated write
- Write missing required field
- Write with extra ghost field
- Write with wrong type
- Write with overly long string
3. Test Runner: I'll skip it in the agent for speed, but the rules will be robust.
