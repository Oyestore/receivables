import bcrypt

password = b"admin123"
# Generate a salt and hash the password
salt = bcrypt.gensalt()
hashed_password = bcrypt.hashpw(password, salt)

print(f"Original password: {password.decode()}")
print(f"Salt: {salt.decode()}")
print(f"Hashed password: {hashed_password.decode()}")

# To verify (example)
# stored_hash = b'$2b$10$somehashfromdatabase...'
# if bcrypt.checkpw(password, stored_hash):
#     print("Password matches!")
# else:
#     print("Password does not match.")

