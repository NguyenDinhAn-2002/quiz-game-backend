import axios from "axios";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY)
  throw new Error("Thiếu OPENROUTER_API_KEY trong biến môi trường.");

const callOpenRouterAI = async (prompt: string): Promise<any> => {
  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-small-3.2-24b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data as {
      choices: { message: { content: string } }[];
    };
    const messageContent = data.choices?.[0]?.message?.content?.trim();

    if (!messageContent)
      throw new Error("Không nhận được câu trả lời hợp lệ từ OpenRouter.");

    const cleaned = messageContent
      .replace(/```json|```/g, "")
      .split("\n")
      .map((line) => line.trim().replace(/^-\s/, ""))
      .join("\n")
      .trim();

    if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
      throw new Error("OpenRouter không trả về JSON như mong đợi.");
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error("❌ Lỗi khi gọi OpenRouter:", error);
    throw new Error("Lỗi gọi API OpenRouter.");
  }
};

export const generateQuizWithAI = async (
  topic: string,
  numQuestions: number
) => {
  const prompt = `Hãy tạo ${numQuestions} câu hỏi trắc nghiệm bằng tiếng Việt về chủ đề "${topic}". 
Mỗi câu hỏi gồm:
- Một câu hỏi (string),
- 4 lựa chọn (array of string),
- Một đáp án đúng (string).

Kết quả trả về theo định dạng JSON như sau:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string"
    }
  ]
}`;

  try {
    const parsedResponse = await callOpenRouterAI(prompt);
    const { questions } = parsedResponse;

    const processedQuestions = questions.map((q: any) => ({
      questionText: q.question,
      options: q.options.map((opt: string) => ({
        text: opt,
        isCorrect: opt === q.correctAnswer,
      })),
      correctAnswer: q.correctAnswer,
      questionType: "single",
    }));

    return {
      questions: processedQuestions,
    };
  } catch (error) {
    console.error("Lỗi khi tạo quiz:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { message: "Tạo quiz thất bại", error: errorMessage };
  }
};
