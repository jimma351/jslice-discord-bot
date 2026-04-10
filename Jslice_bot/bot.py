import os
import json
import discord
from discord import app_commands
from discord.ext import commands
from openai import OpenAI
import anthropic
import gspread
from google.oauth2.service_account import Credentials

# =========================
# ENV VARIABLES
# =========================
TOKEN = os.getenv("DISCORD_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
GOOGLE_CREDS = os.getenv("GOOGLE_CREDS")
SHEET_ID = os.getenv("SHEET_ID")

if not TOKEN:
    raise ValueError("DISCORD_TOKEN is not set.")
if not GOOGLE_CREDS:
    raise ValueError("GOOGLE_CREDS is not set.")
if not SHEET_ID:
    raise ValueError("SHEET_ID is not set.")

client_ai = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
client_claude = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None

# =========================
# DISCORD SETUP
# =========================
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix="!", intents=intents)

ALLOWED_ROLE = "FK"

# =========================
# GOOGLE SHEETS SETUP
# =========================
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

WORKSHEET_NAME = "Sheet1"

try:
    creds_dict = json.loads(GOOGLE_CREDS)
except json.JSONDecodeError as e:
    raise ValueError(f"GOOGLE_CREDS is not valid JSON: {e}")

if "private_key" not in creds_dict or not creds_dict["private_key"]:
    raise ValueError("GOOGLE_CREDS is missing private_key.")

creds_dict["private_key"] = creds_dict["private_key"].replace("\\n", "\n")

creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)
gc = gspread.authorize(creds)

try:
    spreadsheet = gc.open_by_key(SHEET_ID)
except Exception as e:
    raise RuntimeError(
        f"Failed to open spreadsheet. Check SHEET_ID and make sure the sheet is shared with the service account email. Error: {e}"
    )

try:
    sheet = spreadsheet.worksheet(WORKSHEET_NAME)
except gspread.WorksheetNotFound:
    raise RuntimeError(
        f"Worksheet '{WORKSHEET_NAME}' not found. Create a tab with that exact name in your Google Sheet."
    )

headers = ["Item", "Quantity"]
existing_headers = sheet.row_values(1)

if not existing_headers:
    sheet.append_row(headers)
elif existing_headers[:2] != headers:
    sheet.update("A1:B1", [headers])

# =========================
# CRAFTING DATA
# =========================
crafting_data = {
    "Pistols": {
        "Combat Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Heavy Pistol": "5,000 Dirty Money\n2 Pistol Barrels\n3 Pistol Lower\n2 Pistol Upper",
        "SNS Pistol": "5,000 Dirty Money\n1 Pistol Barrels\n1 Pistol Lower\n1 Pistol Upper",
        "Vintage Pistol": "5,000 Dirty Money\n3 Pistol Barrels\n3 Pistol Lower\n3 Pistol Upper",
        "Pistol Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Rifles": {
        "Assault Rifle": "15,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Bullpup Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Compact Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Military Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n2 Rifle Stocks\n3 Rifle Uppers",
        "Rifle Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "SMGs": {
        "Combat Pdw": "12,000 Dirty Money\n2 Rifle Barrels\n2 Rifle Lowers\n2 Rifle Stocks\n2 Rifle Uppers",
        "Micro Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mini Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Mk2 Smg": "12,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock\n1 Rifle Upper",
        "Smg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Shotguns": {
        "Bullpup": "10,000 Dirty Money\n1 Shotgun Barrel\n2 Shotgun Reciever\n1 Shotgun Shock",
        "Mk2 Pump": "10,000 Dirty Money\n2 Shotgun Barrels\n2 Shotgun Recievers\n2 Shotgun Stocks",
        "Pump": "10,000 Dirty Money\n1 Shotgun Barrel\n1 Shotgun Reciever\n1 Shotgun Shock",
        "Shotgun Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "LMGs": {
        "Combat Mg": "15,000 Dirty Money\n2 Rifle Barrel\n2 Rifle Lowers\n1 Rifle Stock\n2 Rifle Uppers",
        "Combat Mg Mk2": "15,000 Dirty Money\n2 Rifle Barrels\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Gusenberg Sweeper": "15,000 Dirty Money\n1 Rifle Barrel\n3 Rifle Lowers\n1 Rifle Stock\n3 Rifle Uppers",
        "Lmg Ammo": "1 Bullet\n1 Casing\n1 Gun Powder",
    },
    "Chemicals": {
        "Aluminum Oxide": "10 Aluminum\n500 Dirty Money\n10 Plastic",
        "Blowtorch": "10 Aluminum\n500 Dirty Money\n10 Metal Scrap",
        "Gun Powder": "500 Dirty Money\n10 Carbon\n10 Potassium Nitrate\n10 Sulfur",
        "Iron Oxide": "500 Dirty Money\n20 Plastic\n10 Rusted Iron",
        "Sticky Bomb": "500 Dirty Money\n3 Electronic Kits\n10 Iron Powder\n10 Metal Scrap\n10 Plastic",
        "Thermite": "500 Dirty Money\n3 Electronic Kits\n10 Metal Scrap\n10 Plastic",
    },
    "Melee": {
        "Bat": "10 Aluminum\n2 Rubber",
        "Battle Axe": "20 Steel\n5 Plastic\n10 Metal Scrap",
        "Crow Bar": "10 Steel\n4 Plastic",
        "Dick Bat": "20 Steel\n20 Rubber\n10 Plastic",
        "Hatchet": "20 Steel\n4 Plastic\n4 Metal Scrap",
        "Knife": "10 Steel",
        "Matchette": "10 Steel\n4 Plastic",
        "Switchblade": "12 Steel",
    },
    "Components": {
        "Pistol Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Pistol Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Pistol Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Rifle Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Rifle Lower": "2 Alumininum Block\n2 Caliper\n5 Milling Bit\n5 Screw\n2 Triggers",
        "Rifle Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
        "Rifle Upper": "4 Alumininum Block\n4 Caliper\n4 Milling Bit\n5 Screw\n4 Spring",
        "Shotgun Barrel": "4 Caliper\n4 Lathe Bits\n4 Steel Block",
        "Shotgun Receiver": "4 Aluminum Block\n4 Caliper\n4 Milling Bit\n4 Screw\n5 Trigger",
        "Shotgun Stock": "4 Caliper\n4 Milling Bits\n4 Plastic Block",
    }
}

MAP_URL = "https://gta-map-tau.vercel.app/"

# =========================
# CONVERSATION MEMORY
# =========================
openai_history = {}
claude_history = {}
MAX_HISTORY = 20

# =========================
# SYSTEM PROMPT
# =========================
def build_guide_context() -> str:
    lines = ["GTA crafting and location guide:"]
    for category, items in crafting_data.items():
        lines.append(f"\n[{category}]")
        for item_name, recipe in items.items():
            lines.append(f"- {item_name}: {recipe}")
    lines.append(f"\n[Map] Full interactive map: {MAP_URL}")
    return "\n".join(lines)

def build_system_prompt() -> str:
    guide_context = build_guide_context()
    return (
        "You are JSlice, an AI assistant living inside a GTA RP Discord server. "
        "You have a Rhode Island attitude — street-smart, sarcastic, confident, but always helpful. "
        "You speak like a local who knows the city and the hustle. Natural, not robotic.\n\n"
        "You can answer ANY question — not just crafting. If someone asks you about real life, "
        "general knowledge, math, advice, whatever — you answer it, in your voice.\n\n"
        "Personality rules:\n"
        "- Keep answers clear and useful.\n"
        "- Use light Rhode Island flavor like 'kid', 'guy', 'c'mon now' — but don't overdo it.\n"
        "- Sound natural, not like customer support.\n\n"
        "Toxic users:\n"
        "- If someone is rude, respond with a short sarcastic clapback.\n"
        "- No slurs, threats, or extreme language.\n"
        "- Stay in control.\n\n"
        "You also know the full crafting guide for this server:\n\n"
        f"{guide_context}"
    )

# =========================
# INVENTORY HELPERS
# =========================
def has_allowed_role(member: discord.Member) -> bool:
    return any(role.name == ALLOWED_ROLE for role in member.roles)

def normalize_item_name(item_name: str) -> str:
    return item_name.strip()

def find_item_row(item_name: str):
    records = sheet.get_all_records()
    for idx, row in enumerate(records, start=2):
        keys = {k.lower(): v for k, v in row.items()}
        sheet_item = str(keys.get("item", "")).strip()
        if sheet_item.lower() == item_name.lower():
            return idx, row
    return None, None

def get_inventory():
    records = sheet.get_all_records()
    return [row for row in records if str(row.get("Item", "")).strip()]

def add_item(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)
    if existing:
        current_qty = int(existing.get("Quantity", 0))
        new_qty = current_qty + quantity
        sheet.update(f"B{row_num}", [[new_qty]])
        return new_qty
    else:
        sheet.append_row([item_name, quantity])
        return quantity

def remove_item(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)
    if not existing:
        return False, "Item not found."
    current_qty = int(existing.get("Quantity", 0))
    if current_qty < quantity:
        return False, f"Not enough quantity. Current: {current_qty}"
    new_qty = current_qty - quantity
    if new_qty <= 0:
        sheet.delete_rows(row_num)
        return True, 0
    else:
        sheet.update(f"B{row_num}", [[new_qty]])
        return True, new_qty

def set_item_quantity(item_name: str, quantity: int):
    row_num, existing = find_item_row(item_name)
    if quantity <= 0:
        if existing:
            sheet.delete_rows(row_num)
        return 0
    if existing:
        sheet.update(f"B{row_num}", [[quantity]])
    else:
        sheet.append_row([item_name, quantity])
    return quantity

# =========================
# CRAFTING VIEWS
# =========================
class ItemSelect(discord.ui.Select):
    def __init__(self, category_name: str):
        self.category_name = category_name
        options = [
            discord.SelectOption(label=item, value=item)
            for item in crafting_data[category_name].keys()
        ]
        super().__init__(
            placeholder=f"Choose a {category_name[:-1] if category_name.endswith('s') else category_name} item",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        item_name = self.values[0]
        recipe = crafting_data[self.category_name][item_name]
        embed = discord.Embed(
            title=f"🔧 {item_name}",
            description=recipe,
            color=discord.Color.blue()
        )
        embed.set_footer(text=f"Category: {self.category_name}")
        await interaction.response.send_message(embed=embed, ephemeral=False)


class ItemView(discord.ui.View):
    def __init__(self, category_name: str):
        super().__init__(timeout=120)
        self.add_item(ItemSelect(category_name))


class CategorySelect(discord.ui.Select):
    def __init__(self):
        options = [
            discord.SelectOption(label=category, value=category)
            for category in crafting_data.keys()
        ]
        super().__init__(
            placeholder="Choose a crafting category",
            min_values=1,
            max_values=1,
            options=options
        )

    async def callback(self, interaction: discord.Interaction):
        category_name = self.values[0]
        view = ItemView(category_name)
        await interaction.response.send_message(
            f"Select an item from **{category_name}**:",
            view=view,
            ephemeral=False
        )


class CategoryView(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=120)
        self.add_item(CategorySelect())

# =========================
# EVENTS
# =========================
@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")
    try:
        bot.tree.clear_commands(guild=None)
        await bot.tree.sync()
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} slash commands.")
        for cmd in synced:
            print(f"  - /{cmd.name}")
    except Exception as e:
        print(f"Slash command sync failed: {e}")

# =========================
# /help
# =========================
@bot.tree.command(name="help", description="Show all available bot commands")
async def help_command(interaction: discord.Interaction):
    embed = discord.Embed(
        title="📋 JSlice Bot — Command List",
        color=discord.Color.gold()
    )

    embed.add_field(
        name="🗺️ Map & Crafting",
        value=(
            "`/gta` — Open the crafting menu (pick category → pick item)\n"
            "`/location` — Get the interactive server map link\n"
        ),
        inline=False
    )

    embed.add_field(
        name="🤖 AI Assistant",
        value=(
            "`/ask [question]` — Ask JSlice anything, powered by **OpenAI**\n"
            "`/askclaude [question]` — Ask JSlice anything, powered by **Claude**\n"
            "`/clearmemory` — Wipe JSlice's memory of your conversation\n"
        ),
        inline=False
    )

    embed.add_field(
        name="📦 Inventory (FK role required)",
        value=(
            "`/additem [item] [qty]` — Add items to the shared inventory\n"
            "`/removeitem [item] [qty]` — Remove items from the shared inventory\n"
            "`/setitem [item] [qty]` — Set an exact quantity for an item\n"
            "`/inventory` — View the full shared inventory\n"
        ),
        inline=False
    )

    embed.add_field(
        name="🎡 Fun",
        value=(
            "`/spinwheel` — Spin the wheel, lands on a random online member!\n"
        ),
        inline=False
    )

    embed.add_field(
        name="🔧 Server Management (Admin only)",
        value=(
            "`/createcategory [name]` — Create a new category\n"
            "`/deletecategory [name]` — Delete a category and all its channels\n"
            "`/createchannel [name] [category] [text/voice]` — Create a channel\n"
            "`/deletechannel [name]` — Delete a channel\n"
            "`/renameserver [name]` — Rename the server\n"
        ),
        inline=False
    )

    embed.set_footer(text="JSlice Crafting Guide • GTA RP Server")
    await interaction.response.send_message(embed=embed)


# =========================
# /location — sends map link
# =========================
@bot.tree.command(name="location", description="Get the interactive server map")
async def location(interaction: discord.Interaction):
    embed = discord.Embed(
        title="🗺️ Server Map",
        description=f"[Click here to open the interactive map]({MAP_URL})",
        color=discord.Color.green()
    )
    embed.set_footer(text="Find locations, landmarks, and more")
    await interaction.response.send_message(embed=embed)


# =========================
# INVENTORY COMMANDS
# =========================
@bot.tree.command(name="additem", description="Add an item to the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Amount to add")
async def additem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return
    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return
    item_name = normalize_item_name(item_name)
    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return
    if quantity <= 0:
        await interaction.response.send_message("Quantity must be more than 0.", ephemeral=True)
        return
    new_qty = add_item(item_name, quantity)
    await interaction.response.send_message(
        f"Added **{quantity}x {item_name}**.\nNew total: **{new_qty}**"
    )


@bot.tree.command(name="removeitem", description="Remove an item from the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Amount to remove")
async def removeitem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return
    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return
    item_name = normalize_item_name(item_name)
    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return
    if quantity <= 0:
        await interaction.response.send_message("Quantity must be more than 0.", ephemeral=True)
        return
    success, result = remove_item(item_name, quantity)
    if not success:
        await interaction.response.send_message(result, ephemeral=True)
        return
    await interaction.response.send_message(
        f"Removed **{quantity}x {item_name}**.\nRemaining: **{result}**"
    )


@bot.tree.command(name="setitem", description="Set an exact quantity for an item in the shared inventory")
@app_commands.describe(item_name="Name of the item", quantity="Exact amount")
async def setitem(interaction: discord.Interaction, item_name: str, quantity: int):
    if not isinstance(interaction.user, discord.Member):
        await interaction.response.send_message("Could not verify your server roles.", ephemeral=True)
        return
    if not has_allowed_role(interaction.user):
        await interaction.response.send_message("You do not have permission to use this command.", ephemeral=True)
        return
    item_name = normalize_item_name(item_name)
    if not item_name:
        await interaction.response.send_message("Item name cannot be empty.", ephemeral=True)
        return
    new_qty = set_item_quantity(item_name, quantity)
    await interaction.response.send_message(
        f"Set **{item_name}** to **{new_qty}**."
    )


@bot.tree.command(name="inventory", description="View the shared inventory")
async def inventory(interaction: discord.Interaction):
    try:
        items = get_inventory()
        if not items:
            await interaction.response.send_message("Inventory is empty.", ephemeral=True)
            return

        lines = []
        for item in items:
            name = str(item.get("Item", "Unknown")).strip()
            qty = item.get("Quantity", 0)
            lines.append(f"**{name}** — {qty}")

        chunks = []
        current_chunk = ""
        for line in lines:
            if len(current_chunk) + len(line) + 1 > 4000:
                chunks.append(current_chunk)
                current_chunk = line
            else:
                if current_chunk:
                    current_chunk += "\n"
                current_chunk += line
        if current_chunk:
            chunks.append(current_chunk)

        embed = discord.Embed(
            title="Shared Inventory",
            description=chunks[0],
            color=discord.Color.blue()
        )
        await interaction.response.send_message(embed=embed)

        for chunk in chunks[1:]:
            extra_embed = discord.Embed(
                title="Shared Inventory (continued)",
                description=chunk,
                color=discord.Color.blue()
            )
            await interaction.followup.send(embed=extra_embed)

    except Exception as e:
        print(f"/inventory error: {e}")
        await interaction.response.send_message(f"Inventory error: {e}", ephemeral=True)


# =========================
# CRAFTING COMMANDS
# =========================
@bot.tree.command(name="gta", description="Open the GTA crafting menu")
async def gta(interaction: discord.Interaction):
    view = CategoryView()
    await interaction.response.send_message(
        "Choose a crafting category:",
        view=view,
        ephemeral=False
    )


# =========================
# /ask — OpenAI (GPT-4o-mini)
# =========================
@bot.tree.command(name="ask", description="Ask JSlice anything — powered by OpenAI")
@app_commands.describe(question="Your question")
async def ask(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    if not client_ai:
        await interaction.followup.send("OPENAI_API_KEY is not set.")
        return

    user_id = interaction.user.id

    if user_id not in openai_history:
        openai_history[user_id] = []

    openai_history[user_id].append({"role": "user", "content": question})

    if len(openai_history[user_id]) > MAX_HISTORY:
        openai_history[user_id] = openai_history[user_id][-MAX_HISTORY:]

    try:
        response = client_ai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": build_system_prompt()}
            ] + openai_history[user_id]
        )

        answer = response.choices[0].message.content.strip()
        if not answer:
            answer = "I couldn't generate an answer."

        openai_history[user_id].append({"role": "assistant", "content": answer})

        if len(answer) > 1900:
            answer = answer[:1900] + "..."

        await interaction.followup.send(f"**[GPT]** {answer}")

    except Exception as e:
        await interaction.followup.send(f"AI error: {e}")


# =========================
# /askclaude — Anthropic (Claude)
# =========================
@bot.tree.command(name="askclaude", description="Ask JSlice anything — powered by Claude")
@app_commands.describe(question="Your question")
async def askclaude(interaction: discord.Interaction, question: str):
    await interaction.response.defer()

    if not client_claude:
        await interaction.followup.send("ANTHROPIC_API_KEY is not set.")
        return

    user_id = interaction.user.id

    if user_id not in claude_history:
        claude_history[user_id] = []

    claude_history[user_id].append({"role": "user", "content": question})

    if len(claude_history[user_id]) > MAX_HISTORY:
        claude_history[user_id] = claude_history[user_id][-MAX_HISTORY:]

    try:
        response = client_claude.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            system=build_system_prompt(),
            messages=claude_history[user_id]
        )

        answer = response.content[0].text.strip()
        if not answer:
            answer = "I couldn't generate an answer."

        claude_history[user_id].append({"role": "assistant", "content": answer})

        if len(answer) > 1900:
            answer = answer[:1900] + "..."

        await interaction.followup.send(f"**[Claude]** {answer}")

    except Exception as e:
        await interaction.followup.send(f"AI error: {e}")


# =========================
# /clearmemory
# =========================
@bot.tree.command(name="clearmemory", description="Clear JSlice's memory of your conversation")
async def clearmemory(interaction: discord.Interaction):
    user_id = interaction.user.id
    openai_history.pop(user_id, None)
    claude_history.pop(user_id, None)
    await interaction.response.send_message("Memory cleared, kid. Fresh start.", ephemeral=True)


# =========================
# ADMIN CHECK HELPER
# =========================
def is_admin(member: discord.Member) -> bool:
    return member.guild_permissions.administrator


# =========================
# SERVER MANAGEMENT COMMANDS (Admin only)
# =========================
@bot.tree.command(name="createcategory", description="Create a new category (Admin only)")
@app_commands.describe(name="Name of the category")
async def createcategory(interaction: discord.Interaction, name: str):
    if not isinstance(interaction.user, discord.Member) or not is_admin(interaction.user):
        await interaction.response.send_message("You need to be an admin to use this.", ephemeral=True)
        return
    try:
        category = await interaction.guild.create_category(name)
        await interaction.response.send_message(f"✅ Category **{category.name}** created.")
    except Exception as e:
        await interaction.response.send_message(f"Error: {e}", ephemeral=True)


@bot.tree.command(name="deletecategory", description="Delete a category and all its channels (Admin only)")
@app_commands.describe(name="Name of the category to delete")
async def deletecategory(interaction: discord.Interaction, name: str):
    if not isinstance(interaction.user, discord.Member) or not is_admin(interaction.user):
        await interaction.response.send_message("You need to be an admin to use this.", ephemeral=True)
        return
    category = discord.utils.get(interaction.guild.categories, name=name)
    if not category:
        await interaction.response.send_message(f"Category **{name}** not found.", ephemeral=True)
        return
    try:
        for channel in category.channels:
            await channel.delete()
        await category.delete()
        await interaction.response.send_message(f"🗑️ Category **{name}** and all its channels deleted.")
    except Exception as e:
        await interaction.response.send_message(f"Error: {e}", ephemeral=True)


@bot.tree.command(name="createchannel", description="Create a channel inside a category (Admin only)")
@app_commands.describe(name="Channel name", category="Category to put it in", kind="text or voice")
@app_commands.choices(kind=[
    app_commands.Choice(name="text", value="text"),
    app_commands.Choice(name="voice", value="voice"),
])
async def createchannel(interaction: discord.Interaction, name: str, category: str, kind: str = "text"):
    if not isinstance(interaction.user, discord.Member) or not is_admin(interaction.user):
        await interaction.response.send_message("You need to be an admin to use this.", ephemeral=True)
        return
    cat = discord.utils.get(interaction.guild.categories, name=category)
    if not cat:
        await interaction.response.send_message(f"Category **{category}** not found.", ephemeral=True)
        return
    try:
        if kind == "voice":
            channel = await interaction.guild.create_voice_channel(name, category=cat)
        else:
            channel = await interaction.guild.create_text_channel(name, category=cat)
        await interaction.response.send_message(f"✅ {kind.title()} channel **{channel.name}** created in **{category}**.")
    except Exception as e:
        await interaction.response.send_message(f"Error: {e}", ephemeral=True)


@bot.tree.command(name="deletechannel", description="Delete a channel (Admin only)")
@app_commands.describe(name="Name of the channel to delete")
async def deletechannel(interaction: discord.Interaction, name: str):
    if not isinstance(interaction.user, discord.Member) or not is_admin(interaction.user):
        await interaction.response.send_message("You need to be an admin to use this.", ephemeral=True)
        return
    channel = discord.utils.get(interaction.guild.channels, name=name)
    if not channel:
        await interaction.response.send_message(f"Channel **{name}** not found.", ephemeral=True)
        return
    try:
        await channel.delete()
        await interaction.response.send_message(f"🗑️ Channel **{name}** deleted.")
    except Exception as e:
        await interaction.response.send_message(f"Error: {e}", ephemeral=True)


@bot.tree.command(name="renameserver", description="Rename the server (Admin only)")
@app_commands.describe(name="New server name")
async def renameserver(interaction: discord.Interaction, name: str):
    if not isinstance(interaction.user, discord.Member) or not is_admin(interaction.user):
        await interaction.response.send_message("You need to be an admin to use this.", ephemeral=True)
        return
    try:
        await interaction.guild.edit(name=name)
        await interaction.response.send_message(f"✅ Server renamed to **{name}**.")
    except Exception as e:
        await interaction.response.send_message(f"Error: {e}", ephemeral=True)


# =========================
# /spinwheel
# =========================
@bot.tree.command(name="spinwheel", description="Spin the wheel — lands on a random online member!")
async def spinwheel(interaction: discord.Interaction):
    await interaction.response.defer()

    members = [
        m for m in interaction.guild.members
        if not m.bot and m.status != discord.Status.offline
    ]

    if len(members) < 2:
        await interaction.followup.send("Not enough online members to spin the wheel, kid.")
        return

    import random
    import asyncio

    winner = random.choice(members)

    spin_frames = ["🎡 Spinning...", "🎡 Spinning... ⠋", "🎡 Spinning... ⠙", "🎡 Spinning... ⠸",
                   "🎡 Spinning... ⠴", "🎡 Spinning... ⠦", "🎡 Spinning... ⠇", "🎡 Spinning... ⠏"]

    msg = await interaction.followup.send("🎡 Starting the wheel...")

    for i in range(12):
        frame = spin_frames[i % len(spin_frames)]
        decoy = random.choice(members)
        await msg.edit(content=f"{frame}\n👤 **{decoy.display_name}**...")
        await asyncio.sleep(0.4 if i < 8 else 0.7)

    embed = discord.Embed(
        title="🎡 The Wheel Has Spoken!",
        description=f"# 🎉 {winner.mention}",
        color=discord.Color.gold()
    )
    embed.set_footer(text=f"Spun by {interaction.user.display_name}")
    if winner.avatar:
        embed.set_thumbnail(url=winner.avatar.url)

    await msg.edit(content="", embed=embed)
