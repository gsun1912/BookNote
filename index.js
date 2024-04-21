import express from "express";
import pg from "pg";
import bodyParser from "body-parser";
import axios from "axios";

const COVER_API = "https://openlibrary.org/search.json";
const app = express();
const port = 3000;
const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  password: "minh1996",
  database: "book",
  port: 5432,
});

db.connect();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));


async function getBook(order) {
  let response = [];
  if (order == "title") {
  response = await db.query("SELECT * FROM booknote ORDER BY title ASC");
  } else if (order == "review_date") {
    response = await db.query("SELECT * FROM booknote ORDER BY review_date DESC");
  } else if (order == "rate") {
    response = await db.query("SELECT * FROM booknote ORDER BY rate DESC");
  };
  return response.rows;
}

// Get all books order by newest
app.get("/", async (req, res) => {
  let books = await getBook("review_date");
  res.render("index.ejs", {
    books: books,
  });
});

// Go to page to write review
app.get("/review", (req, res) => {
  res.render("review.ejs");
});

// Order by books title
app.get("/title", async (req, res) => {
  let books = await getBook("title");
  res.render("index.ejs", {
    books: books,
  });
});

// Order by books rating
app.get("/rating", async (req, res) => {
  let books = await getBook("rate");
  res.render("index.ejs", {
    books: books,
  });
});

// Create a review & add to database
app.post("/review", async (req, res) => {
  let title = req.body.title;
  const param = { q: req.body.title.toLowerCase() };
  title = title.trim().split(" ");
  for (let i = 0; i < title.length; i++) {
    title[i] = title[i][0].toUpperCase() + title[i].substr(1);
  }
  title = title.join(" ");
  const review = req.body.review;
  const rating = parseInt(req.body.rating);
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, "0");
  var mm = String(today.getMonth() + 1).padStart(2, "0");
  var yyyy = today.getFullYear();

  today = yyyy + "-" + mm + "-" + dd;
  const response = await axios.get(COVER_API, {
    params: param,
  });
  if (response.data.numFound == 0) {
    res.render("review.ejs", {
      error: "Book not found",
    });
  } else {
    try {
      await db.query(
        "INSERT INTO booknote(title, review, rate, cover_id, review_date) VALUES ($1, $2, $3, $4, $5)",
        [title, review, rating, response.data.docs[0].cover_i, today]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err.detail);
      res.render("review.ejs", {
        error: "Book already exists",
      });
    }
  }
});
// Go to edit page
app.post("/edit", async (req, res) => {
  const book = await db.query("SELECT * FROM booknote WHERE id= $1", [req.body.updatedItemId]);
  res.render("review.ejs", {
    book : book.rows[0]
  });
});
// Edit a review
app.post("/editbook", async (req, res) => {
  const review = req.body.review;
  const rating = parseInt(req.body.rating);
  const bookId = req.body.updatedItemId;
  await db.query("UPDATE booknote SET review = $1, rate=$2 WHERE id=$3", [review, rating, bookId]);
  res.redirect("/");
});
// Delete a review
app.post("/delete", async(req, res) => {
  const bookId = req.body.updatedItemId;
  await db.query("DELETE FROM booknote WHERE id=$1", [bookId]);
  res.redirect("/");
});
// Find book in database
app.post("/search", async (req, res) => {
  let name = req.body.search;
  name = name.trim().split(" ");
  for (let i = 0; i < name.length; i++) {
    name[i] = name[i][0].toUpperCase() + name[i].substr(1);
  }
  name = name.join(" ");
    const book = await db.query("SELECT * FROM booknote WHERE title LIKE '%'||$1||'%'", [name]);
    if (book.rows.length != 0) {
    res.render("index.ejs", {
        books: book.rows
    });
  } else {
    res.render("index.ejs", {
      error: "Not found"
    });
  }
});


app.listen(port, () => {
  console.log(`Running on port ${port}`);
});
