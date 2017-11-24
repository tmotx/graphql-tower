export default async function upload(credentials, file) {
  const {
    key, bucket, policy, algorithm, credential, date, signature,
  } = JSON.parse(credentials);

  const formData = new FormData();
  formData.append('key', key);
  formData.append('file', file);
  formData.append('policy', policy);
  formData.append('x-amz-algorithm', algorithm);
  formData.append('x-amz-credential', credential);
  formData.append('x-amz-date', date);
  formData.append('x-amz-signature', signature);

  return fetch(`https://${bucket}.s3.amazonaws.com/`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data; charset=utf-8',
    },
    body: formData,
  });
}
