import path from "path";

export function getFilePath(file) {
    const filePath = file.path;

    // Reemplaza las barras invertidas (\) por barras normales (/)
    const normalizedPath = filePath.replace(/\\/g, "/");

    const fileSplit = normalizedPath.split("/");
   

    return `${fileSplit[1]}/${fileSplit[2]}`;
}
