# SnapShare Scaling Plan

## Assumptions and estimates

- SnapShare has 10 million registered users, and 10% are active on an average day.
- Each daily active user uploads one photo and views 50 feed pages each day.
- Uploads and feed-page views are spread evenly across 24 hours for the average-rate estimates.
- A peak feed-view rate is estimated as 5 times the average rate; no separate upload peak factor is assumed.
- Each original photo is 2 MB and its thumbnail is 50 KB. Storage uses decimal units (1 TB = 1,000,000 MB); one year is 365 days.
- All uploaded originals and thumbnails are retained for one year. The storage estimate excludes replication, metadata, backups, and storage-system overhead.
- A feed page view is counted as one feed request; the number of photos shown on each page is unspecified, so image-delivery traffic is not estimated.

Daily active users (DAU):

`10,000,000 registered users × 10% active = 1,000,000 DAU`

| Measure | Calculation | Estimate |
|---|---|---:|
| Photo uploads per day | 1,000,000 DAU × 1 upload | 1,000,000 |
| Average uploads per second | 1,000,000 ÷ 86,400 seconds | 11.6 |
| Feed views per day | 1,000,000 DAU × 50 views | 50,000,000 |
| Average feed views per second | 50,000,000 ÷ 86,400 seconds | 578.7 |
| Peak feed views per second | 578.7 × 5 | 2,893.5 (about 2,894) |
| Original-photo storage per year | 1,000,000 × 2 MB × 365 ÷ 1,000,000 MB/TB | 730 TB |
| Thumbnail storage per year | 1,000,000 × 50 KB × 365 ÷ 1,000,000,000 KB/TB | 18.25 TB |
| Total photo-file storage per year | 730 TB + 18.25 TB | 748.25 TB |

## Read/write profile

SnapShare is read-heavy: it serves about 50 feed-page views for every photo upload, with an average of about 579 feed requests per second versus about 12 uploads per second. The design therefore uses caching, a CDN, and a read replica to scale frequent reads, while keeping uploads durable and moving thumbnail processing off the synchronous request path.

## Why photos belong in object storage

Photo files are large binary objects, so storing them in the database would consume database capacity, make backups and replication heavier, and compete with small, frequently queried metadata for database resources. Store originals and generated thumbnails in scalable object storage, and store only their object keys, ownership, timestamps, and other searchable metadata in the database.

## Architecture

```text
                                   +----------------------+
                                   |      Read replica    |
                                   +-----------^----------+
                                               | replication
                                               |
Users -- feed/photo requests --> [CDN] --> [Load balancer] --> [App servers]
                                    ^                              |   |   \
                                    |                              |   |    \ enqueue thumbnail job
                                    |                         read/write |     v
                                    |                              |   |  [Queue] --> [Thumbnail worker]
                                    |                              |   |                    |
                                    |                         [Cache]  |                    | write thumbnail
                                    |                                 v                    v
                                    +------ photo files ------ [Primary database]     [Object storage]
                                                                       |               ^          |
                                                                       +---------------+          |
                                                                      metadata       originals    |
                                                                                 (upload)         |
                                                                                                   
                         CDN fetches originals and thumbnails from object storage <---------------+
```

### Components

- **CDN:** Caches and delivers photo files close to users, reducing image latency and origin bandwidth.
- **Load balancer:** Distributes incoming application requests across healthy app servers so a single server is not a bottleneck.
- **App servers:** Authenticate users and implement upload, feed, and metadata APIs without holding photo-processing work in the request path.
- **Cache:** Keeps frequently requested feed data and metadata in fast storage to reduce repeated database reads.
- **Primary database:** Durably stores user, follow, and photo metadata and handles writes, while keeping large photo bytes out of database rows.
- **Read replica:** Serves eligible read queries to spread feed-read load away from the primary, with the possibility of slight replication lag.
- **Object storage:** Holds the original photo files and generated thumbnails durably and provides the origin for CDN delivery.
- **Queue:** Buffers thumbnail jobs so uploads can complete without waiting for image processing and workers can process jobs independently.
- **Thumbnail worker:** Consumes queued jobs, creates appropriately sized thumbnails from originals, and saves them to object storage.

## Photo upload flow

1. The client sends an authenticated upload request to the load balancer, which routes it to an app server.
2. The app server validates the request and stores the original photo in object storage, then receives its object key.
3. The app server writes photo metadata and the original object's key to the primary database.
4. The app server enqueues a thumbnail-generation job containing the photo identifier and object key, then returns the upload result to the client.
5. A thumbnail worker consumes the job, fetches the original from object storage, creates a 50 KB-class thumbnail, and stores it in object storage under its own key.
6. The worker updates the photo metadata with the thumbnail key; subsequent requests can retrieve the original or thumbnail through the CDN, which fetches uncached files from object storage.

## Trade-offs

- **Asynchronous thumbnails vs. immediate completeness:** Queuing thumbnail work keeps uploads responsive and isolates processing spikes, but a newly uploaded photo may appear before its thumbnail is ready; the feed needs a temporary placeholder or fallback to the original.
- **CDN caching vs. freshness:** Caching reduces latency and origin load, but updated or removed images may remain cached until expiration; versioned object URLs or explicit invalidation improve freshness at additional complexity or cost.
- **Read replicas vs. read-after-write consistency:** Replicas increase read capacity, but replication lag can briefly make a new upload or metadata update invisible to a feed read; route consistency-sensitive reads to the primary when needed.
- **Feed caching vs. personalized freshness:** Caching assembled feeds reduces database work, but follow changes and new posts can make cached feeds stale; short expirations improve freshness while increasing cache misses and backend load.
