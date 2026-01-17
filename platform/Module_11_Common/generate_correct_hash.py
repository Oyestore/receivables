import bcrypt

password = b"admin123"
salt = bcrypt.gensalt(rounds=10) # Using rounds=10 as it's common for $2b$10
hashed_password = bcrypt.hashpw(password, salt)

print(hashed_password.decode())

