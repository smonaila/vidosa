namespace vidosa.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class addSubjectUserId : DbMigration
    {
        public override void Up()
        {
            AddColumn("dbo.Chapters", "SubjectId", c => c.String());
            AddColumn("dbo.Subjects", "UserId", c => c.String());
        }
        
        public override void Down()
        {
            DropColumn("dbo.Subjects", "UserId");
            DropColumn("dbo.Chapters", "SubjectId");
        }
    }
}
