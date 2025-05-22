import { getUrl, list, uploadData } from "aws-amplify/storage";

export const uploadObject = async (prefix: string, file: File) => {
    await uploadData({
        path: `${prefix}/${file.name}`,
        data: file,
        options: {
            bucket: "storageBucket",
            contentType: file.type,
        },
    });
    return;
};

export const getObjects = async () => {
    const options = {
        bucket: "storageBucket",
    };
    const objectList = await list({
        path: "",
        options: options,
    });
    const objects = await Promise.all(
        objectList.items.map(async (item) => {
            const urlString = (
                await getUrl({
                    path: item.path,
                    options: options,
                })
            ).url.toString();
            return {
                name: item.path.split("/").pop() || "",
                url: urlString,
            };
        })
    );
    return objects;
};
