# File Upload Recon: Recallly

## Summary

Found 0 server-side file upload sites.

## Recon Details

- No multipart parser (`multer`, `busboy`, `formidable`) or `req.file`/`req.files` handler exists.
- Settings export creates browser-side downloads; it does not upload files to the server.
- X media remains provider metadata/URLs and is not accepted as uploaded bytes.
