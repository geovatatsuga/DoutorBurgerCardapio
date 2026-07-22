import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://rcxvibmjkccsanuvoeug.supabase.co";
const SUPABASE_KEY = "sb_publishable_QTgewlIzMXZeo57HIF59Eg_5KZDrPKh";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("=== CHECKING STORES & CREATING ADMIN USER ===");

  // 1. Get store ID
  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, name, slug")
    .eq("slug", "burgerc")
    .single();

  if (storeError || !store) {
    console.error("Store not found:", storeError);
    return;
  }

  console.log(`Store Found: ${store.name} (ID: ${store.id})`);

  const adminEmail = "doutorburger.adm@gmail.com";
  const adminPassword = "DoutorBurger2026!";

  // 2. Try login first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  let userId = null;

  if (signInData?.user) {
    console.log("Admin user already exists and login works!");
    userId = signInData.user.id;
  } else {
    console.log("Admin user sign in failed, attempting signUp:", signInError?.message);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          full_name: "Gerente Doutor Burger",
        },
      },
    });

    if (signUpError) {
      console.error("Sign up error:", signUpError.message);
      return;
    }

    if (signUpData?.user) {
      userId = signUpData.user.id;
      console.log("Created admin user successfully! ID:", userId);
    }
  }

  if (userId) {
    // Check membership
    const { data: membership } = await supabase
      .from("store_memberships")
      .select("*")
      .eq("store_id", store.id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership) {
      console.log("Adding store_memberships role 'owner' for user...");
      const { error: memError } = await supabase.from("store_memberships").insert({
        store_id: store.id,
        user_id: userId,
        role: "owner",
        is_active: true,
      });
      if (memError) {
        console.error("Membership creation error:", memError.message);
      } else {
        console.log("Successfully created store_memberships owner role!");
      }
    } else {
      console.log("User already has store membership:", membership.role);
    }

    console.log("\n=============================================");
    console.log("SUCCESS! ADMIN LOGIN CREDENTIALS:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Senha: ${adminPassword}`);
    console.log("=============================================\n");
  }
}

main().catch(console.error);
