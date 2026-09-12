import { chromium } from "playwright";

async function crawl() {

    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    const url =
        "https://www.albamon.com/jobs/area?areas=I000";

    await page.goto(url, {
        waitUntil: "domcontentloaded"
    });


    console.log("페이지 제목:");
    console.log(await page.title());


    // 모든 링크의 href 가져오기
    const allLinks = await page
        .locator("a")
        .evaluateAll(elements =>
            elements.map(element => ({
                text: element.innerText.trim(),
                href: element.href
            }))
        );


    console.log(
        "\n전체 링크:",
        allLinks.length
    );


    // 알바몬 상세 공고 링크만 추출
    const jobLinks = allLinks.filter(link =>
        link.href.includes("/jobs/detail/")
    );


    // 중복 URL 제거
    const uniqueJobLinks = [
        ...new Map(
            jobLinks.map(link => [
                link.href,
                link
            ])
        ).values()
    ];


    console.log(
        "\n실제 공고 링크:",
        uniqueJobLinks.length
    );


    // 처음 10개 확인
    console.log("\n===== 공고 샘플 =====");

    uniqueJobLinks
        .slice(0, 10)
        .forEach((job, index) => {

            console.log(
                `\n${index + 1}. ${job.text}`
            );

            console.log(job.href);

        });


    await browser.close();
}


crawl();