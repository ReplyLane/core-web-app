import {test,expect,type Page} from "@playwright/test";
import {signIn,cleanUp,seedProfile,clearProfile} from "./session";

async function navigate(page:Page,name:string){
 await expect(page.getByRole("dialog")).toHaveCount(0);
 const menu=page.getByRole("button",{name:"Toggle Sidebar"});if(await menu.isVisible())await menu.click();
 await page.getByRole("button",{name:new RegExp("^"+name+"(?: \\d+)?$")}).click();
 await expect(page.getByRole("dialog",{name:"Sidebar"})).toHaveCount(0);
}
test.beforeEach(async({page,context})=>{await signIn(context);await page.goto("/");await expect(page.getByRole("heading",{name:"Turn comments into conversations."})).toBeVisible();await expect(page.getByRole("button",{name:"New automation",exact:true})).toBeEnabled();});
test.afterAll(()=>cleanUp());

test("connected profile leads into post selection and automation setup",async({page})=>{
 seedProfile();try{
  await page.reload();
  await expect(page.getByRole("heading",{name:"Test Creator",exact:true})).toBeVisible();
  await expect(page.getByText("1,234",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Create your first reply",exact:true}).click();
  await page.route("**/api/instagram/media",route=>route.fulfill({json:{media:[{id:"90001",caption:"Your creator guide",type:"IMAGE",image:"",permalink:""}]}}));
  await page.getByRole("button",{name:"Load my posts",exact:true}).click();
  await page.getByLabel("Instagram post",{exact:true}).selectOption("90001");
  await expect(page.getByLabel("Instagram media ID (optional)",{exact:true})).toHaveValue("90001");
  await page.screenshot({path:".sites-runtime/automation-setup.png",fullPage:true});
  await page.getByRole("button",{name:"Cancel",exact:true}).click();
 }finally{clearProfile();}
});

test("create, persist, edit, test, search, and delete an automation",async({page})=>{
 const name="E2E guide "+Date.now();
 await page.getByRole("button",{name:"New automation",exact:true}).click();
 await page.getByLabel("Automation name",{exact:true}).fill(name);
 await page.getByLabel("Keywords",{exact:true}).fill("GUIDE, LINK");
 await page.getByLabel("Your DM reply",{exact:true}).fill("Here is your creator guide.");
 await page.getByLabel("Link (optional)",{exact:true}).fill("https://creator.example/guide");
 await page.getByRole("button",{name:"Save automation",exact:true}).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await expect(page.getByRole("button",{name:new RegExp(name+" Comment")})).toBeVisible();
 await page.reload();
 await expect(page.getByRole("button",{name:new RegExp(name+" Comment")})).toBeVisible();
 await page.getByRole("button",{name:new RegExp(name+" Comment")}).click();
 await page.getByLabel("Your DM reply",{exact:true}).fill("Updated creator guide reply.");
 await page.getByRole("button",{name:"Save automation",exact:true}).click();
 await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.getByRole("switch",{name:"Enable "+name,exact:true}).click();
 await expect(page.getByText("Connect or reconnect Instagram before enabling this automation.",{exact:true})).toBeVisible();
 await expect(page.getByRole("switch",{name:"Enable "+name,exact:true})).not.toBeChecked();
 await page.getByRole("button",{name:"Test a reply",exact:true}).click();
 await page.getByRole("combobox",{name:"Choose test automation"}).click();
 await page.getByRole("option",{name,exact:true}).click();
 await page.getByLabel("Comment or DM text",{exact:true}).fill("Please send the guide!");
 await page.getByRole("button",{name:"Run test",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Updated creator guide reply.");
 await page.getByLabel("Comment or DM text",{exact:true}).fill("STOP");
 await expect(page.getByRole("status")).toHaveCount(0);
 await page.getByRole("button",{name:"Run test",exact:true}).click();
 await expect(page.getByRole("status")).toContainText("Opt-out keyword");
 await page.getByRole("button",{name:"Close",exact:true}).click();
 await navigate(page,"Activity");
 await expect(page.getByRole("table")).toContainText(name);
 await expect(page.getByRole("table")).toContainText("test matched");
 await navigate(page,"Automations");
 await page.getByLabel("Search automations").fill("zz-no-match");
 await expect(page.getByRole("heading",{name:"No matching automations"})).toBeVisible();
 await page.getByLabel("Search automations").fill(name);
 await page.getByRole("button",{name:"Delete "+name,exact:true}).click();
 await page.getByRole("button",{name:"Keep automation",exact:true}).click();
 await expect(page.getByRole("button",{name:"Delete "+name,exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Delete "+name,exact:true}).click();
 await page.getByRole("button",{name:"Delete automation",exact:true}).click();
 await expect(page.getByRole("button",{name:"Delete "+name,exact:true})).toHaveCount(0);
 await page.reload();
 await expect(page.getByRole("button",{name:"Delete "+name,exact:true})).toHaveCount(0);
});

test("invalid input stays in the editor and explains the error",async({page})=>{
 await page.getByRole("button",{name:"New automation",exact:true}).click();
 await page.getByRole("button",{name:"Save automation",exact:true}).click();
 await expect(page.getByText("Give your automation a name.",{exact:true})).toBeVisible();
 await expect(page.getByRole("dialog")).toBeVisible();
 await page.getByLabel("Automation name",{exact:true}).fill("Retained draft");
 await page.getByLabel("Keywords",{exact:true}).fill("GUIDE");
 await page.getByLabel("Your DM reply",{exact:true}).fill("Your guide.");
 await page.getByLabel("Link (optional)",{exact:true}).fill("http://insecure.example");
 await page.getByRole("button",{name:"Save automation",exact:true}).click();
 await expect(page.getByText("Use a valid HTTPS link.",{exact:true})).toBeVisible();
 await expect(page.getByLabel("Automation name",{exact:true})).toHaveValue("Retained draft");
 await page.getByRole("button",{name:"Cancel",exact:true}).click();
});

test("Instagram and billing show honest setup states",async({page})=>{
 await page.getByRole("button",{name:"Connect Instagram",exact:true}).click();
 const checklist=page.getByRole("button",{name:"View setup checklist",exact:true});
 if(await checklist.count()){
  await expect(page.getByRole("dialog")).toContainText("Meta configuration");
  await checklist.click();
 }else{
  await expect(page.getByRole("dialog").getByRole("link",{name:"Continue with Instagram",exact:true}).or(page.getByRole("dialog").getByRole("link",{name:"Continue with Facebook",exact:true})).first()).toBeVisible();
  await page.getByRole("button",{name:"Close",exact:true}).click();
  await navigate(page,"Settings");
 }
 await expect(page.getByRole("heading",{name:"Your account readiness"})).toBeVisible();
 const privacy=page.getByRole("navigation",{name:"Privacy and support"});
 await expect(privacy.getByRole("link",{name:"Privacy notice",exact:true})).toHaveAttribute("href","/privacy");
 await expect(privacy.getByRole("link",{name:"Data deletion instructions",exact:true})).toHaveAttribute("href","/data-deletion");
 await expect(privacy.getByRole("link",{name:"Contact support",exact:true})).toHaveAttribute("href","mailto:hello@replylane.si");
 await navigate(page,"Plan & billing");
 await expect(page.getByText("$2.99",{exact:false}).first()).toBeVisible();
 await expect(page.getByText("$24.99",{exact:false}).first()).toBeVisible();
 await page.getByRole("button",{name:"Choose monthly",exact:true}).click();
 await expect(page.getByText("Payment setup is not complete. No charge was made.",{exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Choose yearly",exact:true})).toBeEnabled();
});

test("navigation is usable on mobile with no page overflow",async({page})=>{
 for(const view of ["Market research","Plan & billing","Settings","Automations"]){
  await navigate(page,view);
  await expect(page.locator(".breadcrumb strong")).toHaveText(view);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 }
});

test("failed save preserves input and allows a retry",async({page})=>{
 await page.getByRole("button",{name:"New automation",exact:true}).click();
 await page.getByLabel("Automation name",{exact:true}).fill("Network retry draft");
 await page.getByLabel("Keywords",{exact:true}).fill("LINK");
 await page.getByLabel("Your DM reply",{exact:true}).fill("Your reply.");
 await page.route("**/api/campaigns",route=>route.fulfill({status:503,contentType:"text/plain",body:"Temporarily unavailable"}));
 await page.getByRole("button",{name:"Save automation",exact:true}).click();
 await expect(page.getByText("The service is temporarily unavailable. Please try again.",{exact:true})).toBeVisible();
 await expect(page.getByLabel("Automation name",{exact:true})).toHaveValue("Network retry draft");
 await expect(page.getByRole("button",{name:"Save automation",exact:true})).toBeEnabled();
 await page.unroute("**/api/campaigns");
 await page.getByRole("button",{name:"Cancel",exact:true}).click();
});

test("requests without sign-in cannot read or change workspace data",async({browser})=>{
 const anonymous=await browser.newContext();const response=await anonymous.request.get("http://127.0.0.1:5173/api/workspace",{headers:{"oai-authenticated-user-id":"forged","oai-authenticated-user-email":"forged@test.example"}});
 expect(response.status()).toBe(401);
 const write=await anonymous.request.post("http://127.0.0.1:5173/api/campaigns",{data:{name:"Forged"},headers:{Origin:"http://127.0.0.1:5173"}});expect(write.status()).toBe(401);
 await anonymous.close();
});
