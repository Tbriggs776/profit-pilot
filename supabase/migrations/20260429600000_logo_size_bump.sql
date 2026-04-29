-- Bump org-logos bucket file size limit from 2 MB to 10 MB
update storage.buckets
set file_size_limit = 10485760  -- 10 MB
where id = 'org-logos';
