import {test,expect} from "@playwright/test";

test("anonymous visitors see social sign-in and cannot use forged identity headers",async({page,request})=>{
 await page.goto("/");
 await expect(page.getByRole("heading",{name:"Welcome to your lane.",exact:true})).toBeVisible();
 for(const provider of [{name:"Instagram",path:"instagram"},{name:"Facebook",path:"facebook"}]){
  const configured=page.getByRole("link",{name:`Continue with ${provider.name}`,exact:true});
  if(await configured.count())await expect(configured).toHaveAttribute("href",`/api/${provider.path}/connect?intent=login`);
  else await expect(page.getByRole("button",{name:`${provider.name} login coming soon`,exact:true})).toBeDisabled();
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.screenshot({path:".sites-runtime/social-login.png",fullPage:true});
 const response=await request.get("/api/workspace",{headers:{"oai-authenticated-user-id":"forged","oai-authenticated-user-email":"forged@test.example"}});expect(response.status()).toBe(401);
});
test("expired Facebook selection shows a recoverable error",async({page})=>{
 await page.goto("/connect/facebook");
 await expect(page.getByRole("alert")).toContainText("Sign-in expired");
 await page.getByRole("link",{name:"Back to sign-in"}).click();
 await expect(page.getByRole("heading",{name:"Welcome to your lane.",exact:true})).toBeVisible();
});
