# Library Catalog Data Layer

This project defines a PostgreSQL-backed library catalog with Prisma. The schema contains users with patron and librarian roles, genres, books, and optional book reviews.

## Database setup

1. Copy `api/.env.example` to `api/.env` and replace the placeholder with your hosted PostgreSQL connection URL. Do not commit the real `.env` file.
2. From the `api` directory, install dependencies with `npm install`.
3. Run `npm run db:setup` to generate the Prisma Client, apply the checked-in migrations to the configured database, and seed the catalog.

`npm run db:migrate` uses `prisma migrate deploy`, suitable for applying committed migrations to a hosted database. A live database connection is required to apply migrations and run the seed.

## Schema Decisions

`Book` references `Genre` through the `genreId` foreign key instead of embedding genre data in each book. This keeps genre names consistent, avoids repeating the same genre text on every book, and lets PostgreSQL enforce that each book refers to an existing genre. It also makes genre-wide changes and catalog queries straightforward. A genre can have many books, while each book belongs to exactly one genre.

`User.role` uses a `Role` enum so only the supported `PATRON` and `LIBRARIAN` values can be stored. `Review` is an optional extra relation: each review belongs to one book and one user, and the `(bookId, userId)` uniqueness constraint allows at most one review per user for a given book.

Modeling these relationships in Prisma felt different from a document database because foreign keys and relation fields are defined explicitly in the schema; Prisma then generates typed client APIs for traversing those relations rather than storing nested copies of genre and user data in each book document.
