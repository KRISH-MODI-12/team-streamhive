@echo off
echo Installing dependencies...
call npm install

echo.
echo Initializing database and seeding data...
call npm run seed

echo.
echo Starting server...
call npm start
