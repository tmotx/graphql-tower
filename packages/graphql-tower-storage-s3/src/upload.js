export default async function upload(credentials, file, progress) {
  const { endpointUrl, key, params } = JSON.parse(credentials);

  const formData = new FormData();
  Object.keys(params).forEach(name => formData.append(name, params[name]));
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', endpointUrl);
    xhr.onload = () => resolve(key);
    xhr.onerror = () => reject(new Error('failed to upload: network error'));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && progress) {
        progress(event.loaded / event.total);
      }
    };
    xhr.send(formData);
  });
}
