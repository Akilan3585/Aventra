-- Study materials now include lecture videos and audio. Files are uploaded
-- straight from the browser to Storage via signed upload URLs, so the only
-- size cap that matters is the bucket's. 50 MB per file matches the Supabase
-- free-plan ceiling; raise it here (and courseMaterialMaxFileBytes) on Pro.

update storage.buckets
set file_size_limit = 52428800,
    public = false
where id = 'course-materials';
