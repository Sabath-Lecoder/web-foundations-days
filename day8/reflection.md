# Day 8 Reflection

The most difficult concept in the course was designing for correctness when many requests happen at the same time. It was easy to describe a seat as “available” on a screen, but harder to explain how the system could guarantee that two buyers never receive the same seat. I worked through it by tracing competing requests step by step, then using database transactions, row locks, uniqueness constraints, and explicit hold expiration to make the outcome unambiguous.

Based on the feedback I received, I would improve the capstone by making its assumptions and failure paths easier to follow. In particular, I would show more clearly what happens when a payment callback is delayed, a hold expires during checkout, or a user retries a request. I would also separate what the user interface displays from what the database can guarantee, so a cached seat map is never mistaken for a reservation.

Next, I want to learn more about distributed systems observability and load testing. I would practice measuring latency percentiles, queue wait times, and database contention under realistic bursts, then use those measurements to tune admission rates and capacity. That would help me move from a design that sounds scalable to one whose behavior has been tested and can be monitored in production.
