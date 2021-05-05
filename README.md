# Decay Laboratory
This was initialy designed for experimental calculation of an isotope's halflife.
Add atoms to the sample, increment time and watch each isotope decay.

Started: 15/04/2021
Status: active development

## How to Run
In a command shell, run `npm run start` and follow instructions

## How it Works
On the screen is a "Sample". You may add isotopes to the sample.
To start the simulation, press `Start` to increment simulation time every one real-life second, or press `Step` to increment simulation time once.
To control increment time, use the text box to enter a value, and the select combobox to select a unit.
Pressing `Reset` resets the simulation time, and reverts each isotope in the simulation back to its original isotope.

## Insert Isotope
`Periodic Table` -> Click on element -> Click on isotope -> `Insert into Sample`
This isotope will then appear in a random location in the sample

## Interactivity
*Togglable via `Options` -> `Interactive`*
You can interact with each isotope in the sample:
- Click: View isotope information
- Press `h` : View decay history of that atom
- Press `Delete` : Prompt to remove isotope from sample
- Press `l` : log isotope object to developer console

## Legend
This shows an overview of the sample.
Depending on the option, it will either by nothing, show each isotope, or show each element.
Click on `View All` to show every item in the legend
Click on the label next to the colour box to bring up info. Hover over the percentage to see number of atoms and exact percentage (displayed percentage is rounded)

## Manual Override
*Options -> Manual Override*
Allows the user to take manual control of physical processes which would otherwise be impossible e.g. inserting imporrible isotopes (e.g. U-100) and force-decay

The following functionaity is added when an atom is clicked on:
	- 'd' : force-decay isotope, but abide by normal decay rules of that isotope (e.g. 'd' over a stable isotop would not decay it)
	- '#' : [DEBUG] set globals.atom equal to the current atom
	- Shift + 'd' : open force-decay isotope. Choose method of decay to inflict (e.g. alpha decay). Works on any isotopes.
	- Shift + 'a' : force alpha decay (same as shift + d then selecting 'Alpha')
	- Shift + 'e' : edit nucleon count of atom