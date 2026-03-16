import discord
from discord import app_commands
from discord.ext import commands

import os
TOKEN = os.getenv("DISCORD_TOKEN")

intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)

# =========================
# DATA
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
        "Compact Rifle": "15,000 Dirty Money\n1 Rifle Barrel\n1 Rifle Lower\n1 Rifle Stock1\n1 Rifle Upper",
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

locations = {
    "electronics bench": "images/gta_loco.png",
    "map": "images/gta_loco.png"
}


# =========================
# VIEWS
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
    await bot.tree.sync()
    print(f"Logged in as {bot.user}")


# =========================
# COMMANDS
# =========================
@bot.tree.command(name="gta", description="Open the GTA crafting menu")
async def gta(interaction: discord.Interaction):
    view = CategoryView()
    await interaction.response.send_message(
        "Choose a crafting category:",
        view=view,
        ephemeral=False
    )


@bot.tree.command(name="location", description="Show server map location")
@app_commands.describe(place="Location to show")
async def location(interaction: discord.Interaction, place: str):
    place = place.lower().strip()

    if place in locations:
        file = discord.File(locations[place], filename="map.png")
        embed = discord.Embed(
            title=f"📍 {place.title()} Location",
            color=discord.Color.green()
        )
        embed.set_image(url="attachment://map.png")
        await interaction.response.send_message(embed=embed, file=file)
    else:
        await interaction.response.send_message("Location not found.")


bot.run(TOKEN)