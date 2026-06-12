---
title: The Answer is Elsewhere
date: 2026-06-11
tags:
  - dns
publish: true
---

I wanted to build my own DNS server, **but I wound up** learning all about DNS and its backstory.

## What is DNS?

Here's the thing: The Internet actually runs on two languages that don't match. We use names like `example.com`, because of course we remember words. Computers use numbers like `192.0.2.44`, because that's what they actually route traffic with. ==DNS is the piece in the middle that connects them==: type a name, and DNS hands back whatever number is sitting behind it right now — so the name you remember keeps working even when that number changes.

## Backstory

In 1969, four computers at four universities were wired together into **ARPANET** — a project of ARPA, the U.S. Defense Department's research agency (renamed DARPA in 1972). It was the first network of its kind: a dedicated, physically leased set of links that let computers talk to computers.

Researchers used it for two things:

- **Borrowing compute.** If your machine couldn't run a calculation, you'd log into one that could — somewhere across the country — over telnet.
- **Talking to each other.** Researchers used it to reach other researchers, too.

But to connect to another computer, you had to know its raw numeric address. And as the network grew, memorizing numbers stopped being realistic.

==The first fix wasn't a system. It was a person.==

### Ask Jake

Her name was Elizabeth Feinler. Everyone called her Jake.

Through the mid-1970s, Jake and her team at SRI's Network Information Center kept the entire network legible with a single text file: `HOSTS.TXT`. Every computer on ARPANET, and the name it answered to, lived in that one file.

So when a lab connected a new machine, this is what actually happened: someone picked up a landline and called Jake. "Hey Jake — we just added a machine here at UCLA. Can we map its address to the name UCLA?" Her team would check that nobody had already claimed the name, and type the new line into the master file by hand.

> [!note]
> Sit with that for a second. The address book for the entire internet's ancestor was maintained by a human being you could phone. You added your computer to the network by asking her nicely.

Everyone else downloaded the latest copy of `HOSTS.TXT` and synced it to their own machine. Once it was current, a researcher could type UCLA and reach the machine across the country.

### Then the network outgrew her

For a few years, one file and one team kept the whole thing running. Then growth started breaking it:

- **Everyone was out of sync.** Jake updated the file Monday; your machine didn't know until you re-downloaded it. Until then, your address book was simply wrong.
- **The network ran on office hours.** A machine went down at night? The mapping couldn't be fixed until Jake's team walked in the next morning.
- **The file kept swelling.** Every new machine made `HOSTS.TXT` bigger — and every computer on the network re-downloaded the whole thing over FTP, again and again.
- **Names couldn't collide.** Two machines couldn't share a name, so collisions had to be policed — by hand, by Jake, so nobody accidentally hijacked someone else's identity.

Every one of these has the same root. A network that wanted to grow exponentially was bolted to one file that grew with it and one team that updated it by hand. ==You cannot phone your way to the modern internet.==

By 1983, the community knew it. After a series of RFCs, Paul Mockapetris invented DNS — the system that replaced the phone call with a protocol.

---

## Try it: replicate HOSTS.TXT at home

> [!example]
> Before we get into how DNS works, let's replicate what Jake's team did — by hand, right at home.

### Step 1: Spin up an ARPANET node (server)

Your primary machine, running a simple HTTP server:

```bash
python3 -m http.server 8080
```

### Step 2: Find your machine's numeric address

In a new terminal, run the command for your OS:

- **Mac (Wi-Fi):** `ipconfig getifaddr en0`
- **Linux / Mac (universal):** `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows:** `ipconfig` (look for "IPv4 Address" under your Wi-Fi adapter)

### Step 3: Be Jake (edit the hosts file)

Grab your second machine and open its hosts file:

```bash
sudo nano /etc/hosts
```

(On Windows: open Notepad as Administrator and edit `C:\Windows\System32\drivers\etc\hosts`.)

Scroll to the bottom and add one line: your first machine's IP from Step 2 — **not the example below** — then a Tab, then a name. Using `192.168.1.42` won't work; that's a placeholder for your number:

```
<YOUR-IP-FROM-STEP-2>    stanford-mainframe
```

So if Step 2 gave you `192.168.0.9`, your line is:

```
192.168.0.9    stanford-mainframe
```

You just did Jake's entire job: you hand-typed an entry into a machine's address book.

### Step 4: The "LO" moment

In 1969, the first message ever sent over ARPANET was supposed to be LOGIN. The system crashed after two letters — so the first word the network ever spoke was **LO**. Fitting, then, that your first message is just as small.

On the second machine, curl the domain you just invented:

```bash
curl http://stanford-mainframe:8080
```

**Boom.**

Your machine never asked Google DNS, Cloudflare, or your ISP where `stanford-mainframe` lives. It looked in its own local memory, found the line you typed by hand, and fired the packets across the room over Wi-Fi — exactly the way every machine on ARPANET found its neighbors, back when the address book was a person named Jake.
