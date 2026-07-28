const Announcement = require("../../models/Announcement");
const AcademicYear = require("../../models/AcademicYear");
const { resolveYearScope } = require("../../utils/scopeByYear");
const { getPageParams, pagedResponse } = require("../../utils/paginate");
const { ANNOUNCEMENT_SCOPES } = require("../../utils/instituteEnums");

// GET /institute/announcements?academicYear=&page=&limit=
exports.listAnnouncements = async (req, res) => {
  try {
    const { filter } = await resolveYearScope(req);
    const { page, limit, skip } = getPageParams(req);

    const [data, total] = await Promise.all([
      Announcement.find(filter)
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Announcement.countDocuments(filter),
    ]);

    res.json(pagedResponse({ data, total, page, limit }));
  } catch (error) {
    console.error("listAnnouncements error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /institute/announcements
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, targetScope, targetRefs, publishStart, publishEnd } =
      req.body;

    if (!title || !content || !publishStart || !publishEnd) {
      return res.status(400).json({
        success: false,
        message: "العنوان والمحتوى وتاريخا النشر مطلوبة",
      });
    }
    if (targetScope && !ANNOUNCEMENT_SCOPES.includes(targetScope)) {
      return res
        .status(400)
        .json({ success: false, message: "نطاق الاستهداف غير صالح" });
    }

    const activeYear = await AcademicYear.findOne({ isActive: true }).lean();
    const announcement = await Announcement.create({
      title,
      content,
      targetScope: targetScope || "all",
      targetRefs: Array.isArray(targetRefs) ? targetRefs : [],
      publishStart,
      publishEnd,
      academicYear: activeYear?._id,
      author: req.user.id,
    });

    res.status(201).json({ success: true, data: announcement });
  } catch (error) {
    console.error("createAnnouncement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /institute/announcements/:id
exports.updateAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann)
      return res.status(404).json({ success: false, message: "الإعلان غير موجود" });

    const fields = [
      "title",
      "content",
      "targetScope",
      "targetRefs",
      "publishStart",
      "publishEnd",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) ann[f] = req.body[f];
    });

    await ann.save();
    res.json({ success: true, data: ann });
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /institute/announcements/:id
exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndDelete(req.params.id);
    if (!ann)
      return res.status(404).json({ success: false, message: "الإعلان غير موجود" });
    res.json({ success: true, message: "تم حذف الإعلان" });
  } catch (error) {
    console.error("deleteAnnouncement error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
