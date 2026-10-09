# Library Books API

Base path: `/books`

| Method | Path | Description | Example request body | Success |
| --- | --- | --- | --- | --- |
| `GET` | `/books` | Return the list of all books. | — | `200 OK` |
| `GET` | `/books/{id}` | Return the book with the specified ID. | — | `200 OK` |
| `POST` | `/books` | Create a book and return the created resource. | `{"title":"The Hobbit","author":"J. R. R. Tolkien","publishedYear":1937}` | `201 Created` |
| `PUT` | `/books/{id}` | Replace the specified book's details. | `{"title":"The Hobbit","author":"J. R. R. Tolkien","publishedYear":1937}` | `200 OK` |
| `DELETE` | `/books/{id}` | Delete the book with the specified ID. | — | `204 No Content` |
| `GET` | `/books?author={author}` | Return books by the matching author; for example, `/books?author=Ursula%20Le%20Guin`. | — | `200 OK` |

## Errors

- `400 Bad Request` — The request is invalid, such as a create request that omits the required `title` or `author`.
- `404 Not Found` — The requested book ID does not exist, such as `GET /books/9999`.
