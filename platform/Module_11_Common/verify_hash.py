import bcrypt

password_to_check = b"admin123"
stored_hash_from_init_sql = b"$2b$10$X7VYVy.2AwKQKrGQGjkn8.X4.3gJAx1vLZBzMgAn7ZmLxc4OMbTFC"

print(f"Checking password: {password_to_check.decode()}")
print(f"Against stored hash: {stored_hash_from_init_sql.decode()}")

try:
    if bcrypt.checkpw(password_to_check, stored_hash_from_init_sql):
        print("Password matches the stored hash!")
    else:
        print("Password DOES NOT match the stored hash.")
except ValueError as e:
    print(f"Error during hash comparison (likely invalid hash format or salt): {e}")

# For reference, let's also generate a new hash for 'admin123'
new_salt = bcrypt.gensalt()
new_hashed_password = bcrypt.hashpw(password_to_check, new_salt)
print(f"--- For Reference --- ")
print(f"A newly generated hash for '{password_to_check.decode()}' would be: {new_hashed_password.decode()}")
print(f"(Note: bcrypt hashes will be different each time due to salting, but checkpw should still work if the original hash was for the same password)")

