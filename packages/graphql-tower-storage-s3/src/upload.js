export default async function upload(credentials, file) {
  const { endpointUrl, filename, params } = JSON.parse(credentials);

  const formData = new FormData();
  Object.keys(params).forEach(key => formData.append(key, params[key]));
  formData.append('file', file);

  await fetch(endpointUrl, { method: 'POST', body: formData });
  return filename;
}
