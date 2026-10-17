# School database design

## Tables and relationships

- **students** stores each student's name and email. `student_id` is the primary key, and email is required and unique.
- **courses** stores each course's name. `course_id` is the primary key, and the required course name is unique.
- **enrolments** records the fact that a student takes a course, including the student's grade. Its `student_id` and `course_id` are foreign keys; together they form a primary key so the same student cannot enrol on the same course twice.

A student can have many enrolments, and a course can have many enrolments, so each relationship from students to enrolments and from courses to enrolments is one-to-many. Consequently, students and courses have a many-to-many relationship: a student may take several courses, and a course may have several students. The enrolments join table represents each pairing and stores grade, which belongs to that particular student-course pairing rather than to either entity alone.

## Index

The schema adds an index on `enrolments(course_id)`. The composite primary key starts with `student_id`, so it supports student-based lookups, but not efficient lookups by course. This additional index helps queries that find students on a course and count enrolments per course.

## SQL or NoSQL?

I would choose a relational SQL database for this system. Students, courses, and enrolments have clear relationships and integrity rules: foreign keys prevent enrolments for missing records, and a composite primary key prevents duplicate student-course pairs. Grades also belong to a well-defined enrolment row. SQLite can enforce these constraints in a lightweight, file-based database, while joins make the requested reports straightforward.
