const notImplemented = (name) => () => {
  throw new Error(
    `${name} is not implemented after the Supabase migration. Wire this up to a Supabase Edge Function or third-party service if you need it.`
  );
};

export const InvokeLLM = notImplemented('InvokeLLM');
export const SendEmail = notImplemented('SendEmail');
export const SendSMS = notImplemented('SendSMS');
export const UploadFile = notImplemented('UploadFile');
export const GenerateImage = notImplemented('GenerateImage');
export const ExtractDataFromUploadedFile = notImplemented('ExtractDataFromUploadedFile');

export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile,
};
