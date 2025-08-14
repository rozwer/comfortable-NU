# Comfortable NU
[![License](https://img.shields.io/github/license/rozwer/comfortable-NU?color=orange)](https://github.com/rozwer/comfortable-NU/blob/master/LICENSE)
[![Release](https://img.shields.io/github/v/release/rozwer/comfortable-NU?include_prereleases)](https://github.com/rozwer/comfortable-NU/releases)
[![CodeQL](https://github.com/rozwer/comfortable-NU/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/rozwer/comfortable-NU/actions/workflows/codeql-analysis.yml)  
[![npm test](https://github.com/rozwer/comfortable-NU/actions/workflows/npm_tests.yml/badge.svg)](https://github.com/rozwer/comfortable-NU/actions/workflows/npm_tests.yml)

A Web browser Extension for managing assignments and quizzes on Sakai LMS for Nagoya University.  
Originated from [Comfortable PandA](https://github.com/comfortable-panda/ComfortablePandATS) for Kyoto Univ.

# Supported Sakai LMS versions
- Nagoya University Sakai LMS (TACT)
- Sakai 20, 21(Stable)
- Sakai 12(Unverified)

# How to install Comfortable NU
## Google Chrome & Edge
Download from [Chrome Web Store](https://chrome.google.com/webstore/detail/comfortable-sakai/dljchadmceknaijmdmnaaodjkkidhakh)
<!--
1. Download latest version of `comfortable-NU.zip` from [HERE](https://github.com/rozwer/comfortable-NU/releases).
2. Unzip `comfortable-NU.zip`.
3. Go to `chrome://extensions/` on your Google Chrome.
4. Enable **developer mode**.
5. Click **LOAD UNPACKED** button on upper left corner.
6. Select the folder you unzipped and install.
7. You are now ready to use :) Log in to your Sakai LMS website!
-->

## Firefox
Download from [Firefox Addons](https://addons.mozilla.org/ja/firefox/addon/comfortable-sakai/)
<!--
1. Download latest version of `comfortable-NU.zip` from [HERE](https://github.com/rozwer/comfortable-NU/releases).
3. Go to `about:debugging#/runtime/this-firefox` on your Firefox.
5. Click **Load Temporary Add-on...** button in `Temporary Extensions` section.
6. Select the zip file you downloaded and install.
7. You are now ready to use :) Log in to your Sakai LMS website!
-->

## Safari 
Download from [App Store](https://apps.apple.com/jp/app/comfortable-panda/id1572408187?mt=12)

# Documents
Documentation for developers is available at GitHub.  
[GitHub repository](https://github.com/rozwer/comfortable-NU)

# Features

## Enhanced Assignment Management
### Color-coded course site tabs
Colors course site tabs according to the assignment due date.
- ![RED](https://user-images.githubusercontent.com/41512077/169223701-8f434e9b-554f-42f2-9e53-396f87233d5a.png)
  Due date within 1 Day
- ![YELLOW](https://user-images.githubusercontent.com/41512077/169223706-068fb022-7c28-4958-bcd7-9b24d0ad7837.png)
  Due date within 5 Days
- ![GREEN](https://user-images.githubusercontent.com/41512077/169223710-4613fe1f-af15-40ee-9d69-a27ec5c1f0d8.png)
  Due date within 14 Days
- ![GRAY](https://user-images.githubusercontent.com/41512077/169223714-5dc9f6af-2576-40ae-9c03-c426c4a6221b.png)
  Due date over 14 Days

### Assignment Tags
- Resubmission availability indicator
- Late submission availability indicator
  
### Advanced Assignment Tabs
- **Hidden Tab**: Hide specific assignments for a set period or permanently
- **Submitted Tab**: Automatically detect and move submitted assignments
- **Pre-publication control**: Toggle visibility of unpublished assignments

## New Features

### Timetable View
Display courses in a timetable format for easy navigation to course sites.

### Google Calendar Sync
Automatic synchronization with Google Calendar when accessing TACT.

### Memo & Resource Management
- Course-specific memo functionality
- External link management for each course
- Folder-style interface for browsing and bulk downloading course materials

## Notification Badge
Tells your **unchecked** latest assignments.  
Notification badge will appear in the upper left-hand side of a course site tab.

If you open a course site with the notification badge on, the badge will disappear.

## miniSakai (List of assignments and quizzes)
Click `☰` to open miniSakai.
All available assignments as well as quizzes will be displayed with enhanced management features.
You can add your custom assignment to miniSakai as `memo` with PLUS button located on the upper right side.

Also check box is available for you to distinguish completed assignments from working assignments.

## Cache
In order to reduce the network load on Sakai LMS, we have implemented a cache function for fetching assignments and quizzes from REST API.
The default cache interval is as follows:
- Assignment fetching --- 2 minutes
- Quiz fetching --- 10 minutes

The cache time can be changed in the configuration tab in `miniSakai`.

# Screenshot
![](https://user-images.githubusercontent.com/41512077/140854635-974aee4b-fea3-4051-8956-ac696d1648ec.png)


# How to compile from source code
Run
```bash
npm install
export NODE_ENV=production
npm run build:all
```
in the root directory of cloned repository.  
zip files will be placed under `dist/release` directory.

# How to run tests
```bash
npm run test
```

# License
Apache-2.0 License
