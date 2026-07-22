import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rcxvibmjkccsanuvoeug.supabase.co";
const SUPABASE_KEY = "sb_publishable_QTgewlIzMXZeo57HIF59Eg_5KZDrPKh";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET_NAME = "Images";

async function uploadFile(filePath, destinationPath) {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === ".webp" ? "image/webp" : ext === ".png" ? "image/png" : "image/jpeg";

  console.log(`Uploading ${path.basename(filePath)} to bucket '${BUCKET_NAME}' as '${destinationPath}'...`);

  let { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(destinationPath, fileBuffer, {
      contentType,
      cacheControl: "3600",
      upsert: true,
    });

  if (error && (error.message?.includes("not found") || error.error === "Bucket not found")) {
    console.warn(`Bucket '${BUCKET_NAME}' not found, trying 'product-images'...`);
    const fallback = await supabase.storage
      .from("product-images")
      .upload(destinationPath, fileBuffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });
    error = fallback.error;
  }

  if (error) {
    console.error(`Error uploading ${filePath}:`, error.message || error);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(destinationPath);
  console.log(`Uploaded successfully! Public URL: ${data.publicUrl}`);
  return data.publicUrl;
}

async function main() {
  console.log("=== BATCH UPLOADING ALL LOCAL IMAGES TO SUPABASE STORAGE ===");

  const dirsToScan = [
    { dir: path.join(process.cwd(), "assets", "products"), prefix: "products" },
    { dir: path.join(process.cwd(), "assets", "new-direction"), prefix: "new-direction" },
    { dir: path.join(process.cwd(), "assets", "brand"), prefix: "brand" },
  ];

  const uploadedMap = {};

  for (const { dir, prefix } of dirsToScan) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file.endsWith(".webp") || file.endsWith(".png") || file.endsWith(".jpg")) {
        const fullPath = path.join(dir, file);
        const destName = `${prefix}_${file}`;
        const publicUrl = await uploadFile(fullPath, destName);
        if (publicUrl) {
          uploadedMap[`/assets/${prefix}/${file}`] = publicUrl;
          uploadedMap[file] = publicUrl;
        }
      }
    }
  }

  console.log("\n=== ALL IMAGES UPLOADED TO SUPABASE STORAGE ===");
  console.log(JSON.stringify(uploadedMap, null, 2));

  // Now update database products image_path if matching
  const { data: products } = await supabase.from("products").select("id, name, image_path");
  if (products && products.length > 0) {
    console.log("\n=== UPDATING PRODUCTS DATABASE IMAGE_PATH ===");
    for (const prod of products) {
      if (prod.image_path) {
        const basename = path.basename(prod.image_path);
        const matchedUrl = uploadedMap[prod.image_path] || uploadedMap[basename];
        if (matchedUrl) {
          console.log(`Updating product '${prod.name}' image_path to ${matchedUrl}`);
          await supabase.from("products").update({ image_path: matchedUrl }).eq("id", prod.id);
        }
      }
    }
  }

  console.log("\n=== BATCH MIGRATION COMPLETE ===");
}

main().catch(console.error);
