import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const catalog = [
  {
    name: "Fantasy",
    books: [
      ["The Hobbit", "J.R.R. Tolkien", "9780547928227", 1937],
      ["A Wizard of Earthsea", "Ursula K. Le Guin", "9780547773742", 1968],
      ["The Name of the Wind", "Patrick Rothfuss", "9780756404741", 2007],
      ["The Fifth Season", "N.K. Jemisin", "9780316229296", 2015],
    ],
  },
  {
    name: "Science Fiction",
    books: [
      ["Dune", "Frank Herbert", "9780441172719", 1965],
      ["Kindred", "Octavia E. Butler", "9780807083697", 1979],
      ["The Left Hand of Darkness", "Ursula K. Le Guin", "9780441478125", 1969],
      ["Neuromancer", "William Gibson", "9780441569595", 1984],
    ],
  },
  {
    name: "Mystery",
    books: [
      ["The Hound of the Baskervilles", "Arthur Conan Doyle", "9780451469056", 1902],
      ["The Big Sleep", "Raymond Chandler", "9780394758282", 1939],
      ["The Murder of Roger Ackroyd", "Agatha Christie", "9780062073563", 1926],
      ["In the Woods", "Tana French", "9780425220174", 2007],
    ],
  },
  {
    name: "Historical Fiction",
    books: [
      ["The Book Thief", "Markus Zusak", "9780375842207", 2005],
      ["Homegoing", "Yaa Gyasi", "9781101971062", 2016],
      ["A Gentleman in Moscow", "Amor Towles", "9780143110439", 2016],
      ["The Nightingale", "Kristin Hannah", "9780312577223", 2015],
    ],
  },
] as const;

async function main(): Promise<void> {
  for (const genreData of catalog) {
    const genre = await prisma.genre.upsert({
      where: { name: genreData.name },
      update: {},
      create: { name: genreData.name },
    });

    for (const [title, author, isbn, publishedYear] of genreData.books) {
      await prisma.book.upsert({
        where: { isbn },
        update: {
          title,
          author,
          publishedYear,
          genreId: genre.id,
        },
        create: {
          title,
          author,
          isbn,
          publishedYear,
          genreId: genre.id,
        },
      });
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("Library catalog seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
